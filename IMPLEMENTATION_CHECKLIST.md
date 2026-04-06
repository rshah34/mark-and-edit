# Mark & Edit A5 Implementation Checklist

## Scope and Ground Rules
- Build minimum viable implementation prototypes only.
- One demonstrable proof per technical requirement.
- Capture 20-45 second evidence clip per requirement.
- Record the exact source file and function that satisfy each requirement.

## Team Parallelization
- Person A: app scaffold, routing, `hello-world`, `hello-styles`, theme and style tokens.
- Person B: video upload/playback/scrubbing + playback stability checks.
- Person C: real-time marker creation + timing instrumentation (`<100ms`).
- Person D: timeline rendering + marker navigation + seek timing (`<200ms`).
- Person E: marker action panel + resolve/skip behavior + mode transitions.
- Integrator: merge, final QA, evidence recording, and requirement table completion.

## Requirement -> Implementation Mapping

1. Hello World
- Pass criteria: route renders plain `Hello World` in browser.
- Code location: `src/components/HelloWorldPage.tsx`.
- Evidence: screen recording navigating to `/hello-world`.

2. Hello Styles
- Pass criteria: dark theme, blue/green/red/orange accents, Inter font, marker icons shown.
- Code locations: `src/components/HelloStylesPage.tsx`, `src/styles/index.css`.
- Evidence: screen recording navigating to `/hello-styles` and pointing at each style item.

3. Video playback with real-time interaction
- Pass criteria: upload clip, play/pause, scrub range, interaction while playback continues.
- Code location: `src/components/PrototypePage.tsx` (`onUpload`, `togglePlayback`, player controls).
- Evidence: clip showing playback + tap/keypress marker creation without stopping playback.

4. Real-time marker creation during playback
- Pass criteria: `Tap`, `Shift+Tap/X`, and `C` create marker types with `inputToCreateDelayMs` tracked.
- Code location: `src/components/PrototypePage.tsx` (`addMarker`, keydown handler, `onVideoTap`).
- Evidence: clip showing 3 marker types and status row median create latency.

5. Timeline generation with visual markers
- Pass criteria: markers appear at relative timestamps, type colors differ, count matches inputs.
- Code location: `src/components/PrototypePage.tsx` timeline section.
- Evidence: clip at end of playback showing timeline marker positions and marker count.

6. Marker interaction and navigation
- Pass criteria: clicking marker seeks video and records `seekLatencyMs`.
- Code location: `src/components/PrototypePage.tsx` (`onSelectMarker`, `onSeeked`).
- Evidence: click multiple markers; show status row median seek latency.

7. Basic edit actions per marker
- Pass criteria: marker action panel shows options; resolve/skip updates state; caption save updates note.
- Code location: `src/components/PrototypePage.tsx` (`resolveSelected`, action panel).
- Evidence: resolve one marker of each type and show open/resolved/skipped counters updating.

8. UI state transitions
- Pass criteria: clear transitions among `landing -> watching/marking -> editing -> finalPlayback`.
- Code location: `src/components/PrototypePage.tsx` (`mode` state + transitions).
- Evidence: one full run showing mode changes in top status row.

## Heuristic Fixes Built into Prototype
- Visibility of system status (Severity 4): persistent status row (mode, time, marker counts, latency metrics).
- User control and freedom (Severity 4): `Exit to landing`, `Back to watch mode`, dismiss error.
- Error prevention/recovery (Severity 4): explicit inline errors for missing video, unresolved markers, empty caption.
- Recognition over recall (Severity 3): always-visible interaction guide + live tap hint.
- Help/documentation (Severity 2): route-level guidance and interaction labels.

## Evidence Capture Checklist (Submission)
- [ ] Requirement 1 evidence clip + code link
- [ ] Requirement 2 evidence clip + code link
- [ ] Requirement 3 evidence clip + code link
- [ ] Requirement 4 evidence clip + code link
- [ ] Requirement 5 evidence clip + code link
- [ ] Requirement 6 evidence clip + code link
- [ ] Requirement 7 evidence clip + code link
- [ ] Requirement 8 evidence clip + code link
- [ ] Heuristic improvements clip (status, navigation freedom, error recovery)

## Next Implementation Steps
- Add synthetic benchmark panel to compute p50/p95 marker create and seek latency.
- Add dedicated route for timeline-live-update variant (if mentor requests live updates during playback).
- Add lightweight export of session markers to JSON for demo repeatability.
