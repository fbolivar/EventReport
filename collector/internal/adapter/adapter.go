// Package adapter defines what every brand must implement (design section 4.3).
//
// The rest of the collector never mentions a brand. Adding a firewall vendor
// means writing one of these and nothing else: if it ever requires touching
// the aggregator, the rules or the portal, the normalized model is wrong.
package adapter

import (
	"context"

	"github.com/fbolivar/eventreport/collector/internal/normalize"
)

// Adapter is one firewall brand.
type Adapter interface {
	// Brand is the code the shared contract uses ("fortigate", "sophos_xg"...).
	Brand() string

	// Capabilities declares what this brand and version can answer.
	Capabilities() normalize.Capabilities

	// TestConnection verifies credentials and reachability before enrolment.
	TestConnection(ctx context.Context) error

	// FetchConfig pulls the configuration and normalizes it.
	FetchConfig(ctx context.Context) (*normalize.Config, error)

	// ParseLog turns one raw syslog line into an event. The second return is
	// false when the line is not recognised: it is counted, never guessed.
	ParseLog(line []byte) (*normalize.Event, bool)
}
