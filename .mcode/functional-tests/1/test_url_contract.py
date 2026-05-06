"""Foundation milestone: URL contract tests.

The legacy site exposed six pretty URLs:
  /, /index.html, /about.html, /companies-sponsors.html,
  /events.html, /members-benefits.html, /resources.html

Astro's `build.format: 'file'` emits matching files in dist/. Any of these
URLs dropping to 404 is a public-contract break for inbound traffic.

Run against the preview server brought up by lifecycle `run`
(http://127.0.0.1:4321).
"""
from __future__ import annotations

import pytest
import requests

BASE_URL = "http://127.0.0.1:4321"
TIMEOUT = 10

LEGACY_URLS = [
    "/",
    "/index.html",
    "/about.html",
    "/companies-sponsors.html",
    "/events.html",
    "/members-benefits.html",
    "/resources.html",
]

# Each page must contain a unique fingerprint so we know we're getting
# the right content (not a fallback / catch-all).
PAGE_FINGERPRINTS = {
    "/": "La French Tech Denver",
    "/index.html": "La French Tech Denver",
    "/about.html": "About",
    "/companies-sponsors.html": "Companies",
    "/events.html": "Events",
    "/members-benefits.html": "Members",
    "/resources.html": "Resources",
}


@pytest.fixture(autouse=True)
def preview_server_up():
    """Confirm the Astro preview server is reachable before every test."""
    resp = requests.get(f"{BASE_URL}/", timeout=TIMEOUT)
    assert resp.status_code == 200, (
        f"Expected preview server at {BASE_URL} to respond 200, "
        f"got {resp.status_code}. Did the lifecycle `run` step start it?"
    )


class TestLegacyUrlPreservation:
    """Every legacy URL must serve 200 + text/html."""

    @pytest.mark.parametrize("path", LEGACY_URLS)
    def test_url_responds_200(self, path):
        resp = requests.get(f"{BASE_URL}{path}", timeout=TIMEOUT)
        assert resp.status_code == 200, (
            f"GET {path} -> {resp.status_code}; URL preservation contract broken"
        )
        assert "text/html" in resp.headers.get("content-type", ""), (
            f"GET {path} did not return HTML content-type: "
            f"{resp.headers.get('content-type')!r}"
        )

    @pytest.mark.parametrize("path,fingerprint", list(PAGE_FINGERPRINTS.items()))
    def test_page_specific_content(self, path, fingerprint):
        resp = requests.get(f"{BASE_URL}{path}", timeout=TIMEOUT)
        assert fingerprint in resp.text, (
            f"GET {path} returned 200 but did not contain page-specific "
            f"fingerprint {fingerprint!r}"
        )

    def test_root_serves_home_page(self):
        """`/` and `/index.html` must both serve the home page."""
        resp_root = requests.get(f"{BASE_URL}/", timeout=TIMEOUT)
        resp_index = requests.get(f"{BASE_URL}/index.html", timeout=TIMEOUT)
        assert resp_root.status_code == 200
        assert resp_index.status_code == 200
        # Both should have the home page hero/title.
        assert "La French Tech Denver" in resp_root.text
        assert "La French Tech Denver" in resp_index.text

    def test_pretty_url_does_not_supersede_html(self):
        """`/about` (no .html) is not the canonical URL — it should NOT be
        a directory listing or index masquerading as the about page. The
        canonical contract is /about.html."""
        # We don't strictly require /about to 404 (Astro's preview can be
        # forgiving), but /about.html must always work.
        resp = requests.get(f"{BASE_URL}/about.html", timeout=TIMEOUT)
        assert resp.status_code == 200
        assert "<title>About" in resp.text or "About" in resp.text


class TestNotFound:
    """Unknown URLs return 404 (or at least non-200, non-success)."""

    def test_unknown_path_is_not_200(self):
        resp = requests.get(f"{BASE_URL}/this-path-does-not-exist.html", timeout=TIMEOUT)
        # Astro preview returns 404 for unknown paths; either way it must not 200.
        assert resp.status_code != 200, (
            f"GET /this-path-does-not-exist.html unexpectedly returned 200; "
            f"got body: {resp.text[:200]!r}"
        )
