package transport

import (
	"context"
	"crypto/ed25519"
	"encoding/base64"
	"io"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func newClient(t *testing.T, url string) *Client {
	t.Helper()

	_, private, err := ed25519.GenerateKey(nil)
	if err != nil {
		t.Fatal(err)
	}

	client := New(url, "col-1", private)
	client.MaxAttempts = 3
	return client
}

func TestSignatureVerifiesAgainstTheBody(t *testing.T) {
	public, private, err := ed25519.GenerateKey(nil)
	if err != nil {
		t.Fatal(err)
	}

	var verified bool

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		body, _ := io.ReadAll(r.Body)
		signature, err := base64.StdEncoding.DecodeString(r.Header.Get("x-signature"))
		if err != nil {
			t.Errorf("firma no es base64: %v", err)
		}

		verified = ed25519.Verify(public, body, signature)

		if r.Header.Get("x-collector-id") != "col-1" {
			t.Errorf("falta el identificador del colector")
		}
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"ok":true}`))
	}))
	defer server.Close()

	client := New(server.URL, "col-1", private)

	response, err := client.Post(context.Background(), "heartbeat", map[string]any{"eps": 118})
	if err != nil {
		t.Fatalf("post: %v", err)
	}
	if response.Status != http.StatusOK {
		t.Fatalf("estado = %d", response.Status)
	}
	if !verified {
		t.Fatal("la firma debe validar contra el cuerpo exacto que viajó")
	}
}

func TestRetriesOnServerErrorAndSucceeds(t *testing.T) {
	var attempts int

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		attempts++
		if attempts < 3 {
			w.WriteHeader(http.StatusBadGateway)
			return
		}
		w.WriteHeader(http.StatusOK)
	}))
	defer server.Close()

	client := newClient(t, server.URL)
	// Keep the test fast: the backoff itself is not what is under test.
	client.HTTP.Timeout = 2 * time.Second

	response, err := client.Post(context.Background(), "ingest-rollups", map[string]any{})
	if err != nil {
		t.Fatalf("debería reintentar un 5xx: %v", err)
	}
	if response.Status != http.StatusOK || attempts != 3 {
		t.Fatalf("estado = %d, intentos = %d", response.Status, attempts)
	}
}

func TestDoesNotRetryClientError(t *testing.T) {
	var attempts int

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		attempts++
		w.WriteHeader(http.StatusUnauthorized)
		w.Write([]byte(`{"error":"invalid signature"}`))
	}))
	defer server.Close()

	client := newClient(t, server.URL)

	response, err := client.Post(context.Background(), "heartbeat", map[string]any{})
	if err != nil {
		t.Fatalf("un 4xx se devuelve, no se convierte en error de red: %v", err)
	}
	if response.Status != http.StatusUnauthorized {
		t.Fatalf("estado = %d", response.Status)
	}
	if attempts != 1 {
		t.Fatalf("intentos = %d: reintentar un 4xx no cambia nada", attempts)
	}
}
