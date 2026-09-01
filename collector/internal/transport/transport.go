// Package transport talks to the SaaS (design section 6.7).
//
// Every request is signed with the collector's Ed25519 private key, which is
// generated at enrolment and never leaves this machine. The cloud resolves the
// tenant from the signed collector id, so a stolen payload cannot be replayed
// into another customer's data.
package transport

import (
	"bytes"
	"context"
	"crypto/ed25519"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

// Client posts signed payloads to the Edge Functions.
type Client struct {
	BaseURL     string
	CollectorID string
	PrivateKey  ed25519.PrivateKey
	HTTP        *http.Client
	// MaxAttempts covers a flaky link, not a broken payload: a 4xx is final.
	MaxAttempts int
}

func New(baseURL, collectorID string, key ed25519.PrivateKey) *Client {
	return &Client{
		BaseURL:     baseURL,
		CollectorID: collectorID,
		PrivateKey:  key,
		HTTP:        &http.Client{Timeout: 30 * time.Second},
		MaxAttempts: 4,
	}
}

// Response is what the functions answer.
type Response struct {
	Status int
	Body   []byte
}

// Post signs and sends the payload, retrying only what is worth retrying.
func (c *Client) Post(ctx context.Context, function string, payload any) (*Response, error) {
	body, err := json.Marshal(payload)
	if err != nil {
		return nil, fmt.Errorf("serializar %s: %w", function, err)
	}

	signature := base64.StdEncoding.EncodeToString(ed25519.Sign(c.PrivateKey, body))
	url := fmt.Sprintf("%s/functions/v1/%s", c.BaseURL, function)

	attempts := c.MaxAttempts
	if attempts < 1 {
		attempts = 1
	}

	var lastErr error
	for attempt := range attempts {
		if attempt > 0 {
			// Exponential backoff: 1s, 2s, 4s. A collector that hammers a
			// failing endpoint helps nobody.
			delay := time.Duration(1<<(attempt-1)) * time.Second
			select {
			case <-ctx.Done():
				return nil, ctx.Err()
			case <-time.After(delay):
			}
		}

		request, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(body))
		if err != nil {
			return nil, err
		}
		request.Header.Set("content-type", "application/json")
		request.Header.Set("x-collector-id", c.CollectorID)
		request.Header.Set("x-signature", signature)

		response, err := c.HTTP.Do(request)
		if err != nil {
			lastErr = err
			continue
		}

		answer, readErr := io.ReadAll(response.Body)
		response.Body.Close()
		if readErr != nil {
			lastErr = readErr
			continue
		}

		// 4xx means the request itself is wrong: retrying changes nothing and
		// the caller has to see it.
		if response.StatusCode >= 400 && response.StatusCode < 500 {
			return &Response{Status: response.StatusCode, Body: answer}, nil
		}
		if response.StatusCode >= 500 {
			lastErr = fmt.Errorf("%s respondió %d", function, response.StatusCode)
			continue
		}

		return &Response{Status: response.StatusCode, Body: answer}, nil
	}

	return nil, fmt.Errorf("%s falló tras %d intentos: %w", function, attempts, lastErr)
}
