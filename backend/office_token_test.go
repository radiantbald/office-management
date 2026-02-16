package main

import "testing"

func TestAccessTokenRoundTripIncludesResponsibilities(t *testing.T) {
	t.Parallel()

	secret := []byte("test-secret")
	claims := OfficeAccessTokenClaims{
		EmployeeID: "12345",
		UserName:   "Test User",
		Role:       roleEmployee,
		Responsibilities: &TokenResponsibilities{
			Buildings:  []int64{1, 5},
			Floors:     []int64{10},
			Coworkings: []int64{42, 99},
		},
	}

	token, err := SignOfficeAccessToken(claims, secret)
	if err != nil {
		t.Fatalf("SignOfficeAccessToken() error = %v", err)
	}

	parsed, err := VerifyOfficeAccessToken(token, secret)
	if err != nil {
		t.Fatalf("VerifyOfficeAccessToken() error = %v", err)
	}
	if parsed == nil {
		t.Fatal("VerifyOfficeAccessToken() returned nil claims")
	}
	if parsed.Responsibilities == nil {
		t.Fatal("expected responsibilities in parsed access token claims")
	}
	if len(parsed.Responsibilities.Buildings) != 2 ||
		parsed.Responsibilities.Buildings[0] != 1 ||
		parsed.Responsibilities.Buildings[1] != 5 {
		t.Fatalf("unexpected buildings responsibilities: %#v", parsed.Responsibilities.Buildings)
	}
	if len(parsed.Responsibilities.Floors) != 1 || parsed.Responsibilities.Floors[0] != 10 {
		t.Fatalf("unexpected floors responsibilities: %#v", parsed.Responsibilities.Floors)
	}
	if len(parsed.Responsibilities.Coworkings) != 2 ||
		parsed.Responsibilities.Coworkings[0] != 42 ||
		parsed.Responsibilities.Coworkings[1] != 99 {
		t.Fatalf("unexpected coworkings responsibilities: %#v", parsed.Responsibilities.Coworkings)
	}
	if parsed.Iss == "" {
		t.Fatal("expected iss to be set")
	}
	if len(parsed.Aud) == 0 {
		t.Fatal("expected aud to be set")
	}
	if parsed.Nbf == 0 {
		t.Fatal("expected nbf to be set")
	}
	if parsed.JTI == "" {
		t.Fatal("expected jti to be set")
	}
}

func TestAccessTokenVerificationRejectsWrongIssuerAndAudience(t *testing.T) {
	secret := []byte("test-secret")
	claims := OfficeAccessTokenClaims{
		EmployeeID: "12345",
		Role:       roleEmployee,
		Iss:        "some-other-service",
		Aud:        []string{"not-office-api"},
	}

	token, err := SignOfficeAccessToken(claims, secret)
	if err != nil {
		t.Fatalf("SignOfficeAccessToken() error = %v", err)
	}

	if _, err := VerifyOfficeAccessToken(token, secret); err == nil {
		t.Fatal("expected VerifyOfficeAccessToken() to reject wrong iss/aud")
	}
}

func TestRefreshTokenRoundTripSetsTokenIDAndJTI(t *testing.T) {
	t.Parallel()

	secret := []byte("test-secret")
	claims := OfficeRefreshTokenClaims{
		EmployeeID: "12345",
	}

	token, err := SignOfficeRefreshToken(claims, secret)
	if err != nil {
		t.Fatalf("SignOfficeRefreshToken() error = %v", err)
	}

	parsed, err := VerifyOfficeRefreshToken(token, secret)
	if err != nil {
		t.Fatalf("VerifyOfficeRefreshToken() error = %v", err)
	}
	if parsed.TokenID == "" {
		t.Fatal("expected token_id to be set")
	}
	if parsed.JTI == "" {
		t.Fatal("expected jti to be set")
	}
	if parsed.JTI != parsed.TokenID {
		t.Fatalf("expected jti=%q to equal token_id=%q", parsed.JTI, parsed.TokenID)
	}
}
