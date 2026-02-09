FROM golang:1.22-alpine AS build

WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download

COPY backend ./backend
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o /out/api ./backend

FROM alpine:3.19

WORKDIR /app
ENV PORT=8080
RUN adduser -D -u 10001 app && \
    mkdir -p /app/uploads && \
    chown -R app:app /app
COPY --from=build /out/api /app/api

EXPOSE 8080
USER app
CMD ["/app/api"]
