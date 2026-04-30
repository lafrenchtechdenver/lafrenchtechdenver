"""Milestone 2 — URL preservation contract.

The site MUST keep the legacy six `.html` URLs as the canonical surface so
inbound links and search engines aren't broken. This is enforced by
`build.format: 'file'` in `astro.config.mjs`. We also verify that the GitHub
Pages custom-domain marker file `/CNAME` is served verbatim with the apex
domain plus a trailing newline.

Run against the preview server brought up by the lifecycle `run` script
(http://127.0.0.1:4321).
"""
from __future__ import annotations

import pytest
import requests

BASE_URL = "http://127.0.0.1:4321"
TIMEOUT = 10

# Six legacy URLs + the bare-domain root. Every one must respond 200.
LEGACY_URLS = [
    "/",
    "/index.html",
    "/about.html",
    "/companies-sponsors.html",
    "/events.html",
    "/members-benefits.html",
    "/resources.html",
]


@pytest.fixture(autouse=True)
def preview_server_up():
    """Confirm the Astro preview server is reachable before every test."""
    resp = requests.get(f"{BASE_URL}/", timeout=TIMEOUT)
    assert resp.status_code == 200, (
        f"Expected preview server at {BASE_URL} to respond 200, "
        f"got {resp.status_code}. Did the lifecycle `run` step start it?"
    )


class TestLegacyUrls:
    """Every legacy .html URL must resolve 200 with text/html."""

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

    @pytest.mark.parametrize("path", LEGACY_URLS)
    def test_page_contains_site_title(self, path):
        resp = requests.get(f"{BASE_URL}{path}", timeout=TIMEOUT)
        assert resp.status_code == 200
        # Every page renders the BaseLayout, which sets the title to "La French
        # Tech Denver" by default and includes the brand text in the nav.
        assert "La French Tech Denver" in resp.text, (
            f"GET {path} body did not contain 'La French Tech Denver'"
        )


class TestCnameMarker:
    """`/CNAME` must serve the apex domain verbatim (incl. trailing newline)
    so GitHub Pages keeps lafrenchtechdenver.com routed to the static site."""

    def test_cname_served_with_200(self):
        resp = requests.get(f"{BASE_URL}/CNAME", timeout=TIMEOUT)
        assert resp.status_code == 200, (
            f"GET /CNAME -> {resp.status_code}; "
            "GitHub Pages custom-domain marker is missing from the build output"
        )

    def test_cname_body_is_apex_domain(self):
        resp = requests.get(f"{BASE_URL}/CNAME", timeout=TIMEOUT)
        # The contract is exactly "lafrenchtechdenver.com\n". Some servers may
        # not preserve the trailing newline, so we accept both forms but
        # require the apex domain content with no other text.
        body = resp.text
        assert body.strip() == "lafrenchtechdenver.com", (
            f"/CNAME body should be 'lafrenchtechdenver.com' (with trailing "
            f"newline), got {body!r}"
        )
