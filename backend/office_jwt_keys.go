package main

import (
	"crypto"
	"crypto/hmac"
	"crypto/rand"
	"crypto/rsa"
	"crypto/sha256"
	"crypto/x509"
	"encoding/json"
	"encoding/pem"
	"errors"
	"fmt"
	"os"
	"sort"
	"strings"
	"time"
)

const (
	jwtAlgHS256 = "HS256"
	jwtAlgRS256 = "RS256"
)

type jwtHeaderData struct {
	Alg string `json:"alg"`
	Typ string `json:"typ,omitempty"`
	Kid string `json:"kid,omitempty"`
}

type officeJWTSigningKey struct {
	kid        string
	alg        string
	hsSecret   []byte
	rsaPrivate *rsa.PrivateKey
}

type officeJWTVerificationKey struct {
	kid       string
	alg       string
	hsSecret  []byte
	rsaPublic *rsa.PublicKey
}

type officeTokenKeyManager struct {
	signingKey               *officeJWTSigningKey
	verificationKeysByKID    map[string]*officeJWTVerificationKey
	legacyHS256VerifierNoKID *officeJWTVerificationKey
	legacyHS256Secret        []byte
}

func (m *officeTokenKeyManager) CanSign() bool {
	return m != nil && m.signingKey != nil
}

func (m *officeTokenKeyManager) CanVerify() bool {
	if m == nil {
		return false
	}
	return len(m.verificationKeysByKID) > 0 || m.legacyHS256VerifierNoKID != nil
}

func (m *officeTokenKeyManager) LegacySecret() []byte {
	if m == nil || len(m.legacyHS256Secret) == 0 {
		return nil
	}
	out := make([]byte, len(m.legacyHS256Secret))
	copy(out, m.legacyHS256Secret)
	return out
}

func newLegacyHS256KeyManager(secret []byte) *officeTokenKeyManager {
	trimmed := strings.TrimSpace(string(secret))
	if trimmed == "" {
		return &officeTokenKeyManager{
			verificationKeysByKID: map[string]*officeJWTVerificationKey{},
		}
	}
	normalized := []byte(trimmed)
	verifier := &officeJWTVerificationKey{
		alg:      jwtAlgHS256,
		hsSecret: normalized,
	}
	return &officeTokenKeyManager{
		signingKey: &officeJWTSigningKey{
			alg:      jwtAlgHS256,
			hsSecret: normalized,
		},
		verificationKeysByKID:    map[string]*officeJWTVerificationKey{},
		legacyHS256VerifierNoKID: verifier,
		legacyHS256Secret:        normalized,
	}
}

func loadOfficeTokenKeyManagerFromEnv() (*officeTokenKeyManager, error) {
	manager := &officeTokenKeyManager{
		verificationKeysByKID: make(map[string]*officeJWTVerificationKey),
	}

	legacySecret := strings.TrimSpace(os.Getenv("OFFICE_JWT_SECRET"))
	if legacySecret != "" {
		legacyVerifier := &officeJWTVerificationKey{
			alg:      jwtAlgHS256,
			hsSecret: []byte(legacySecret),
		}
		manager.legacyHS256VerifierNoKID = legacyVerifier
		manager.legacyHS256Secret = []byte(legacySecret)
		manager.signingKey = &officeJWTSigningKey{
			alg:      jwtAlgHS256,
			hsSecret: []byte(legacySecret),
		}
	}

	privateByKID, err := readRSAPEMMapFromEnv("OFFICE_JWT_PRIVATE_KEYS_JSON")
	if err != nil {
		return nil, err
	}
	publicByKID, err := readRSAPEMMapFromEnv("OFFICE_JWT_PUBLIC_KEYS_JSON")
	if err != nil {
		return nil, err
	}

	activeKID := strings.TrimSpace(os.Getenv("OFFICE_JWT_ACTIVE_KID"))
	if activeKID == "" {
		activeKID = strings.TrimSpace(os.Getenv("OFFICE_JWT_KID"))
	}

	if singlePrivate := normalizePEMFromEnv(strings.TrimSpace(os.Getenv("OFFICE_JWT_PRIVATE_KEY_PEM"))); singlePrivate != "" {
		kid := activeKID
		if kid == "" {
			kid = "office-rs256-current"
			activeKID = kid
		}
		privateByKID[kid] = singlePrivate
	}
	if singlePublic := normalizePEMFromEnv(strings.TrimSpace(os.Getenv("OFFICE_JWT_PUBLIC_KEY_PEM"))); singlePublic != "" {
		kid := activeKID
		if kid == "" {
			kid = "office-rs256-current"
		}
		if _, exists := publicByKID[kid]; !exists {
			publicByKID[kid] = singlePublic
		}
	}

	parsedPrivateByKID := make(map[string]*rsa.PrivateKey, len(privateByKID))
	for kid, rawPEM := range privateByKID {
		privateKey, err := parseRSAPrivateKeyPEM(rawPEM)
		if err != nil {
			return nil, fmt.Errorf("jwt key %q: parse private key: %w", kid, err)
		}
		parsedPrivateByKID[kid] = privateKey
		manager.verificationKeysByKID[kid] = &officeJWTVerificationKey{
			kid:       kid,
			alg:       jwtAlgRS256,
			rsaPublic: &privateKey.PublicKey,
		}
	}
	for kid, rawPEM := range publicByKID {
		publicKey, err := parseRSAPublicKeyPEM(rawPEM)
		if err != nil {
			return nil, fmt.Errorf("jwt key %q: parse public key: %w", kid, err)
		}
		if _, exists := manager.verificationKeysByKID[kid]; !exists {
			manager.verificationKeysByKID[kid] = &officeJWTVerificationKey{
				kid:       kid,
				alg:       jwtAlgRS256,
				rsaPublic: publicKey,
			}
		}
	}

	if len(parsedPrivateByKID) == 1 && activeKID == "" {
		for kid := range parsedPrivateByKID {
			activeKID = kid
		}
	}
	if len(parsedPrivateByKID) > 1 && activeKID == "" {
		keys := make([]string, 0, len(parsedPrivateByKID))
		for kid := range parsedPrivateByKID {
			keys = append(keys, kid)
		}
		sort.Strings(keys)
		return nil, fmt.Errorf("OFFICE_JWT_ACTIVE_KID is required when multiple private keys are configured: %s", strings.Join(keys, ", "))
	}
	if activeKID != "" {
		if len(parsedPrivateByKID) > 0 {
			activeKey, exists := parsedPrivateByKID[activeKID]
			if !exists {
				return nil, fmt.Errorf("OFFICE_JWT_ACTIVE_KID=%q is not present in configured private keys", activeKID)
			}
			manager.signingKey = &officeJWTSigningKey{
				kid:        activeKID,
				alg:        jwtAlgRS256,
				rsaPrivate: activeKey,
			}
		}
	}

	return manager, nil
}

func readRSAPEMMapFromEnv(name string) (map[string]string, error) {
	raw := strings.TrimSpace(os.Getenv(name))
	if raw == "" {
		return map[string]string{}, nil
	}
	decoded := map[string]string{}
	if err := json.Unmarshal([]byte(raw), &decoded); err != nil {
		return nil, fmt.Errorf("%s: parse JSON map: %w", name, err)
	}
	result := make(map[string]string, len(decoded))
	for kid, pemBody := range decoded {
		normalizedKID := strings.TrimSpace(kid)
		if normalizedKID == "" {
			return nil, fmt.Errorf("%s: key id must be non-empty", name)
		}
		normalizedPEM := normalizePEMFromEnv(pemBody)
		if normalizedPEM == "" {
			return nil, fmt.Errorf("%s: empty PEM for kid %q", name, normalizedKID)
		}
		result[normalizedKID] = normalizedPEM
	}
	return result, nil
}

func normalizePEMFromEnv(raw string) string {
	trimmed := strings.TrimSpace(raw)
	if trimmed == "" {
		return ""
	}
	return strings.ReplaceAll(trimmed, `\n`, "\n")
}

func parseRSAPrivateKeyPEM(raw string) (*rsa.PrivateKey, error) {
	block, _ := pem.Decode([]byte(raw))
	if block == nil {
		return nil, errors.New("pem decode failed")
	}
	if pkcs1, err := x509.ParsePKCS1PrivateKey(block.Bytes); err == nil {
		return pkcs1, nil
	}
	keyAny, err := x509.ParsePKCS8PrivateKey(block.Bytes)
	if err != nil {
		return nil, err
	}
	key, ok := keyAny.(*rsa.PrivateKey)
	if !ok {
		return nil, errors.New("private key is not RSA")
	}
	return key, nil
}

func parseRSAPublicKeyPEM(raw string) (*rsa.PublicKey, error) {
	block, _ := pem.Decode([]byte(raw))
	if block == nil {
		return nil, errors.New("pem decode failed")
	}
	if pkcs1, err := x509.ParsePKCS1PublicKey(block.Bytes); err == nil {
		return pkcs1, nil
	}
	publicAny, err := x509.ParsePKIXPublicKey(block.Bytes)
	if err == nil {
		if rsaKey, ok := publicAny.(*rsa.PublicKey); ok {
			return rsaKey, nil
		}
		return nil, errors.New("public key is not RSA")
	}
	cert, certErr := x509.ParseCertificate(block.Bytes)
	if certErr != nil {
		return nil, err
	}
	rsaKey, ok := cert.PublicKey.(*rsa.PublicKey)
	if !ok {
		return nil, errors.New("certificate key is not RSA")
	}
	return rsaKey, nil
}

func (k *officeJWTSigningKey) sign(signingInput []byte) ([]byte, error) {
	switch k.alg {
	case jwtAlgHS256:
		return hmacSHA256(signingInput, k.hsSecret), nil
	case jwtAlgRS256:
		hashed := sha256.Sum256(signingInput)
		return rsa.SignPKCS1v15(rand.Reader, k.rsaPrivate, crypto.SHA256, hashed[:])
	default:
		return nil, fmt.Errorf("unsupported jwt signing alg %q", k.alg)
	}
}

func (k *officeJWTVerificationKey) verify(signingInput, sig []byte) bool {
	switch k.alg {
	case jwtAlgHS256:
		expected := hmacSHA256(signingInput, k.hsSecret)
		return hmac.Equal(sig, expected)
	case jwtAlgRS256:
		hashed := sha256.Sum256(signingInput)
		return rsa.VerifyPKCS1v15(k.rsaPublic, crypto.SHA256, hashed[:], sig) == nil
	default:
		return false
	}
}

func (m *officeTokenKeyManager) signJWT(claims any, tokenType string) (string, error) {
	if m == nil || m.signingKey == nil {
		return "", fmt.Errorf("%s: no signing key configured", tokenType)
	}
	header := jwtHeaderData{
		Alg: m.signingKey.alg,
		Typ: "JWT",
	}
	if strings.TrimSpace(m.signingKey.kid) != "" {
		header.Kid = strings.TrimSpace(m.signingKey.kid)
	}
	headerJSON, err := json.Marshal(header)
	if err != nil {
		return "", fmt.Errorf("%s: marshal header: %w", tokenType, err)
	}
	payloadJSON, err := json.Marshal(claims)
	if err != nil {
		return "", fmt.Errorf("%s: marshal claims: %w", tokenType, err)
	}
	headerEncoded := base64URLEncode(headerJSON)
	payloadEncoded := base64URLEncode(payloadJSON)
	signingInput := headerEncoded + "." + payloadEncoded
	signature, err := m.signingKey.sign([]byte(signingInput))
	if err != nil {
		return "", fmt.Errorf("%s: sign jwt: %w", tokenType, err)
	}
	return signingInput + "." + base64URLEncode(signature), nil
}

func (m *officeTokenKeyManager) verifyJWT(tokenStr, tokenType string, dst any) error {
	if m == nil {
		return fmt.Errorf("%s: key manager is not configured", tokenType)
	}
	parts := strings.Split(tokenStr, ".")
	if len(parts) != 3 {
		return fmt.Errorf("%s: malformed token", tokenType)
	}

	headerBytes, err := base64URLDecode(parts[0])
	if err != nil {
		return fmt.Errorf("%s: decode header: %w", tokenType, err)
	}
	var header jwtHeaderData
	if err := json.Unmarshal(headerBytes, &header); err != nil {
		return fmt.Errorf("%s: parse header: %w", tokenType, err)
	}
	signingInput := parts[0] + "." + parts[1]
	sigBytes, err := base64URLDecode(parts[2])
	if err != nil {
		return fmt.Errorf("%s: decode signature: %w", tokenType, err)
	}

	verifier := m.selectVerifier(header)
	if verifier == nil {
		if header.Kid == "" {
			return fmt.Errorf("%s: no verification key for alg=%s (kid is empty)", tokenType, header.Alg)
		}
		return fmt.Errorf("%s: no verification key for alg=%s kid=%s", tokenType, header.Alg, header.Kid)
	}
	if !verifier.verify([]byte(signingInput), sigBytes) {
		return fmt.Errorf("%s: invalid signature", tokenType)
	}

	payloadJSON, err := base64URLDecode(parts[1])
	if err != nil {
		return fmt.Errorf("%s: decode payload: %w", tokenType, err)
	}
	if err := json.Unmarshal(payloadJSON, dst); err != nil {
		return fmt.Errorf("%s: unmarshal claims: %w", tokenType, err)
	}
	return nil
}

func (m *officeTokenKeyManager) selectVerifier(header jwtHeaderData) *officeJWTVerificationKey {
	if m == nil {
		return nil
	}
	alg := strings.TrimSpace(header.Alg)
	kid := strings.TrimSpace(header.Kid)
	if kid != "" {
		verifier := m.verificationKeysByKID[kid]
		if verifier == nil {
			return nil
		}
		if verifier.alg != alg {
			return nil
		}
		return verifier
	}
	if alg == jwtAlgHS256 {
		return m.legacyHS256VerifierNoKID
	}
	return nil
}

func SignOfficeAccessTokenWithKeyManager(claims OfficeAccessTokenClaims, keys *officeTokenKeyManager) (string, error) {
	now := time.Now().UTC()
	claims = prepareOfficeAccessClaims(claims, now)
	if claims.Exp == 0 {
		claims.Exp = now.Add(officeAccessTokenTTL).Unix()
	}
	return keys.signJWT(claims, "office_access_token")
}

func VerifyOfficeAccessTokenWithKeyManager(tokenStr string, keys *officeTokenKeyManager) (*OfficeAccessTokenClaims, error) {
	var claims OfficeAccessTokenClaims
	if err := keys.verifyJWT(tokenStr, "office_access_token", &claims); err != nil {
		return nil, err
	}
	if err := validateOfficeAccessClaims(claims); err != nil {
		return nil, err
	}
	return &claims, nil
}

func SignOfficeRefreshTokenWithKeyManager(claims OfficeRefreshTokenClaims, keys *officeTokenKeyManager) (string, error) {
	now := time.Now().UTC()
	claims = prepareOfficeRefreshClaims(claims, now)
	if claims.Exp == 0 {
		claims.Exp = now.Add(officeRefreshTokenTTL).Unix()
	}
	if claims.FamilyID == "" {
		claims.FamilyID = generateTokenID()
	}
	return keys.signJWT(claims, "office_refresh_token")
}

func VerifyOfficeRefreshTokenWithKeyManager(tokenStr string, keys *officeTokenKeyManager) (*OfficeRefreshTokenClaims, error) {
	var claims OfficeRefreshTokenClaims
	if err := keys.verifyJWT(tokenStr, "office_refresh_token", &claims); err != nil {
		return nil, err
	}
	if claims.TokenID == "" {
		claims.TokenID = strings.TrimSpace(claims.JTI)
	}
	if err := validateOfficeRefreshClaims(claims); err != nil {
		return nil, err
	}
	return &claims, nil
}
