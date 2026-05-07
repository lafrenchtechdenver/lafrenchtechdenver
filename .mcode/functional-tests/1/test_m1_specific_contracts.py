"""Foundation milestone: explicit M1 contract assertions.

These tests cover specific concerns called out for M1 self-verification that
are NOT already covered by the other test files in this directory:

  - Theme bootstrap is a synchronous inline `<script is:inline>` inside <head>
    (NO `defer`, NO `async`, NO `type="module"`).
  - Burger menu button carries BOTH `aria-controls` AND `aria-expanded`.
  - The skip-to-content link is the FIRST child of <body> (so it picks up the
    initial Tab focus before nav).
  - The home page renders the "What is La French Tech Denver" card.
  - Each emitted file exists on disk under `dist/` (the build artifact, not
    just the running preview server).
  - `dist/CNAME` exists on disk and contains the apex domain.
  - `dist/sitemap-index.xml`, `dist/sitemap-0.xml`, `dist/robots.txt` exist
    on disk and are wired together correctly.

Run against the preview server brought up by lifecycle `run`
(http://127.0.0.1:4321), with `dist/` present at the repo root.
"""
from __future__ import annotations

import re
from pathlib import Path

import pytest
import requests

BASE_URL = "http://127.0.0.1:4321"
TIMEOUT = 10

REPO_ROOT = Path(__file__).resolve().parents[3]
DIST_DIR = REPO_ROOT / "dist"

LEGACY_FILES = [
    "index.html",
    "about.html",
    "companies-sponsors.html",
    "events.html",
    "members-benefits.html",
    "resources.html",
]

LEGACY_URLS = [f"/{p}" for p in LEGACY_FILES]


@pytest.fixture(autouse=True)
def preview_server_up():
    resp = requests.get(f"{BASE_URL}/", timeout=TIMEOUT)
    assert resp.status_code == 200, (
        f"Expected preview server at {BASE_URL} to respond 200, "
        f"got {resp.status_code}. Did the lifecycle `run` step start it?"
    )


# ----------------------------------------------------------------------
# Theme bootstrap script attribute discipline
# ----------------------------------------------------------------------

# Match the FIRST <script ...> tag whose body contains the theme-bootstrap
# fingerprint (`localStorage.getItem('theme')`), allowing for arbitrary
# whitespace between attributes. We capture the attributes-only chunk so we
# can assert what it does AND what it doesn't carry.
THEME_BOOTSTRAP_RE = re.compile(
    r"<script\b([^>]*)>\s*\(function[^<]*?localStorage\.getItem\('theme'\)",
    re.DOTALL,
)


class TestThemeBootstrapAttributes:
    """The theme bootstrap must run synchronously in <head> — NO defer / async /
    type="module". Anything else reintroduces a flash-of-unstyled-theme on
    reload for dark-mode users (see
    /l2l/mcode/instructions/keep_theme_bootstrap_inline_in_head.md).

    Note: Astro strips `is:inline` from the rendered HTML — it's a compile-time
    directive that tells Astro to emit the script's body verbatim as a plain
    <script> rather than bundling it. The runtime contract we check is therefore
    "no defer / no async / no type=module attribute on the rendered tag" plus
    "the bootstrap body is present inline (not src-loaded)".
    """

    @pytest.mark.parametrize("path", LEGACY_URLS)
    def test_bootstrap_body_is_inlined(self, path):
        resp = requests.get(f"{BASE_URL}{path}", timeout=TIMEOUT)
        html = resp.text
        m = THEME_BOOTSTRAP_RE.search(html)
        assert m, (
            f"Could not locate the inline theme bootstrap <script> tag on "
            f"{path}; it should contain `localStorage.getItem('theme')` "
            f"directly in the response body."
        )
        attrs = m.group(1)
        # `src="..."` would mean the bootstrap is loaded from a separate URL,
        # which would also be defer-loaded — defeats the point.
        assert "src=" not in attrs, (
            f"Theme bootstrap on {path} is loaded via src attribute "
            f"({attrs!r}); it must be inlined."
        )

    @pytest.mark.parametrize("path", LEGACY_URLS)
    def test_bootstrap_has_no_defer_async_module(self, path):
        resp = requests.get(f"{BASE_URL}{path}", timeout=TIMEOUT)
        html = resp.text
        m = THEME_BOOTSTRAP_RE.search(html)
        assert m, f"Theme bootstrap script tag not found on {path}"
        attrs = m.group(1)
        # A synchronous inline script in <head> may not carry any of these.
        assert " defer" not in attrs and not attrs.startswith("defer"), (
            f"Theme bootstrap on {path} has `defer` — would FOUC on reload. "
            f"Tag attributes: {attrs!r}"
        )
        assert " async" not in attrs and not attrs.startswith("async"), (
            f"Theme bootstrap on {path} has `async` — would FOUC on reload. "
            f"Tag attributes: {attrs!r}"
        )
        assert 'type="module"' not in attrs and "type='module'" not in attrs, (
            f"Theme bootstrap on {path} has `type=\"module\"` (defer-by-spec) "
            f"— would FOUC on reload. Tag attributes: {attrs!r}"
        )

    @pytest.mark.parametrize("path", LEGACY_URLS)
    def test_bootstrap_lives_in_head(self, path):
        """The <script> with the bootstrap must appear before </head>, not later."""
        resp = requests.get(f"{BASE_URL}{path}", timeout=TIMEOUT)
        html = resp.text
        head_close = html.find("</head>")
        m = THEME_BOOTSTRAP_RE.search(html)
        assert head_close > 0, f"No </head> found on {path}"
        assert m, f"Bootstrap not found on {path}"
        bootstrap_pos = m.start()
        assert bootstrap_pos < head_close, (
            f"Theme bootstrap on {path} is positioned AFTER </head>. "
            f"bootstrap@{bootstrap_pos}, </head>@{head_close}"
        )


# ----------------------------------------------------------------------
# Burger button accessibility attributes
# ----------------------------------------------------------------------

# Match the burger <button ...> element regardless of attribute order.
BURGER_BUTTON_RE = re.compile(
    r"<button\b([^>]*\bid=\"burger-button\"[^>]*)>",
    re.DOTALL,
)


class TestBurgerAccessibility:
    """The burger toggles a collapsible region; assistive tech relies on
    aria-controls + aria-expanded (see
    /l2l/mcode/instructions/sync_aria-expanded_on_disclosure_toggles.md)."""

    @pytest.mark.parametrize("path", LEGACY_URLS)
    def test_burger_has_aria_controls(self, path):
        resp = requests.get(f"{BASE_URL}{path}", timeout=TIMEOUT)
        html = resp.text
        m = BURGER_BUTTON_RE.search(html)
        assert m, f"No burger button (id=burger-button) found on {path}"
        attrs = m.group(1)
        assert 'aria-controls="menu"' in attrs, (
            f"Burger on {path} missing aria-controls=\"menu\"; attrs: {attrs!r}"
        )

    @pytest.mark.parametrize("path", LEGACY_URLS)
    def test_burger_has_aria_expanded(self, path):
        resp = requests.get(f"{BASE_URL}{path}", timeout=TIMEOUT)
        html = resp.text
        m = BURGER_BUTTON_RE.search(html)
        assert m, f"No burger button found on {path}"
        attrs = m.group(1)
        assert "aria-expanded" in attrs, (
            f"Burger on {path} missing aria-expanded; attrs: {attrs!r}"
        )

    @pytest.mark.parametrize("path", LEGACY_URLS)
    def test_aria_expanded_initial_value_is_false(self, path):
        """Initial state on first paint: menu is closed, so aria-expanded='false'."""
        resp = requests.get(f"{BASE_URL}{path}", timeout=TIMEOUT)
        html = resp.text
        m = BURGER_BUTTON_RE.search(html)
        assert m, f"No burger button found on {path}"
        attrs = m.group(1)
        assert 'aria-expanded="false"' in attrs, (
            f"Burger on {path} should ship with aria-expanded=\"false\" — "
            f"got attrs {attrs!r}"
        )


# ----------------------------------------------------------------------
# Skip link is first body child
# ----------------------------------------------------------------------


class TestSkipLinkPlacement:
    """The skip-to-content link must be the FIRST child of <body>. The risks
    section of MILESTONE.md explicitly calls this out: placing it inside
    <Nav> would let the burger's outside-click handler eat the click."""

    @pytest.mark.parametrize("path", LEGACY_URLS)
    def test_skip_link_is_first_body_child(self, path):
        resp = requests.get(f"{BASE_URL}{path}", timeout=TIMEOUT)
        html = resp.text
        body_open_match = re.search(r"<body\b[^>]*>", html)
        assert body_open_match, f"No <body> tag on {path}"
        body_inner = html[body_open_match.end():]
        # The first non-whitespace, non-comment HTML token after <body> must
        # be the skip-to-content anchor.
        # Strip leading whitespace and HTML comments.
        cursor = body_inner.lstrip()
        while cursor.startswith("<!--"):
            end = cursor.find("-->")
            assert end >= 0, "Unterminated comment after <body>"
            cursor = cursor[end + 3 :].lstrip()
        # Now expect the skip link.
        # Tolerate either ordering of class= and href= on the <a>.
        first_tag_match = re.match(r"<(\w+)\b([^>]*)>", cursor)
        assert first_tag_match, (
            f"Could not find any HTML tag immediately after <body> on {path}: "
            f"{cursor[:120]!r}"
        )
        tag_name = first_tag_match.group(1).lower()
        attrs = first_tag_match.group(2)
        assert tag_name == "a", (
            f"First child of <body> on {path} is <{tag_name}> not <a> "
            f"(skip link). attrs={attrs!r}"
        )
        assert 'href="#main-content"' in attrs, (
            f"First <a> after <body> on {path} is not the skip link "
            f"(href=#main-content). attrs={attrs!r}"
        )


# ----------------------------------------------------------------------
# "What is La French Tech Denver" card on home
# ----------------------------------------------------------------------


class TestHomeWhatIsCard:
    """The home page must include the legacy 'What is La French Tech Denver'
    card. M1 ships this as part of the full home page (M3 moves the copy to
    a content collection)."""

    @pytest.fixture(scope="class")
    def home_html(self):
        resp = requests.get(f"{BASE_URL}/index.html", timeout=TIMEOUT)
        assert resp.status_code == 200
        return resp.text

    def test_what_is_heading_present(self, home_html):
        # The section heading is verbatim the legacy heading copy.
        assert "What is La French Tech Denver" in home_html, (
            "The 'What is La French Tech Denver' card heading is missing on /"
        )


# ----------------------------------------------------------------------
# Filesystem-level dist/ assertions
# ----------------------------------------------------------------------


class TestDistDirectoryArtifacts:
    """`pnpm build` must emit the legacy URL files, CNAME, robots.txt, and
    both sitemap files into dist/. The preview server serves these from disk;
    if any are missing on disk, GitHub Pages (which serves files directly
    from the artifact) will 404 even if the local preview is happy."""

    def test_dist_directory_exists(self):
        assert DIST_DIR.is_dir(), (
            f"dist/ does not exist at {DIST_DIR}; did `pnpm build` run?"
        )

    @pytest.mark.parametrize("filename", LEGACY_FILES)
    def test_dist_legacy_html_file_exists(self, filename):
        f = DIST_DIR / filename
        assert f.is_file(), (
            f"dist/{filename} missing — URL preservation contract broken at "
            f"the build artifact level"
        )
        # Sanity-check the file isn't empty.
        size = f.stat().st_size
        assert size > 0, f"dist/{filename} is 0 bytes"

    def test_dist_cname_exists_and_matches_apex_domain(self):
        cname = DIST_DIR / "CNAME"
        assert cname.is_file(), (
            "dist/CNAME missing — GitHub Pages will detach the custom domain"
        )
        body = cname.read_text(encoding="utf-8").strip()
        assert body == "lafrenchtechdenver.com", (
            f"dist/CNAME body was {body!r}, expected 'lafrenchtechdenver.com'"
        )

    def test_dist_sitemap_index_exists(self):
        f = DIST_DIR / "sitemap-index.xml"
        assert f.is_file(), "dist/sitemap-index.xml missing"

    def test_dist_sitemap_0_exists(self):
        f = DIST_DIR / "sitemap-0.xml"
        assert f.is_file(), "dist/sitemap-0.xml missing"

    def test_dist_sitemap_0_uses_html_suffix(self):
        body = (DIST_DIR / "sitemap-0.xml").read_text(encoding="utf-8")
        # The serialize() override must keep the .html suffix on every loc.
        for filename in LEGACY_FILES:
            url = f"<loc>https://lafrenchtechdenver.com/{filename}</loc>"
            assert url in body, (
                f"sitemap-0.xml is missing canonical .html URL {url!r} — "
                "preserve_html_suffix_in_sitemap convention violated"
            )

    def test_dist_robots_txt_exists_and_references_sitemap(self):
        f = DIST_DIR / "robots.txt"
        assert f.is_file(), "dist/robots.txt missing"
        body = f.read_text(encoding="utf-8")
        assert (
            "Sitemap: https://lafrenchtechdenver.com/sitemap-index.xml" in body
        ), "dist/robots.txt does not reference the production sitemap-index.xml"
