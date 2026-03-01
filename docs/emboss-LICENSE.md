# Emboss Gantt Library — License

Copyright (c) 2025 Leantime, Inc. All rights reserved.

## Summary

Emboss is a commercial JavaScript library developed and owned by Leantime, Inc.
This file and all other files in the `emboss/` directory are licensed separately
from the Leantime application and are **NOT** covered by Leantime's AGPL-3.0 license.

## Included in Leantime

Leantime includes a licensed copy of Emboss (including Organize-tier extensions)
as a bundled third-party dependency. This inclusion does not change Emboss's
license terms. The Emboss library remains a separate work under the terms below.

## Terms

This software is provided under the Emboss Commercial License.

**You MAY:**
- Use this library as part of the Leantime application under Leantime's license terms
- View the source code for debugging purposes within the Leantime application

**You MAY NOT:**
- Extract, copy, or redistribute this library or any portion of it outside of Leantime
- Use this library in any other application without a separate Emboss license
- Modify this library and redistribute the modifications
- Sublicense this library to third parties
- Claim AGPL-3.0 or any other open-source license applies to this library

## Obtaining a License

To use Emboss in your own application, visit https://getemboss.io or contact
licensing@leantime.io for commercial licensing options.

## Emboss Tiers

- **Free:** Core renderer, today-marker, dependency-arrows, tooltips — available
  under the Emboss Free License at https://getemboss.io
- **Organize:** Sidebar, milestones renderer, phases renderer, inline-edit —
  requires Organize license
- **Enterprise:** Custom extensions, priority support, SLA — contact sales

## Relationship to Leantime

Leantime's application source code (PHP, Blade templates, CSS bridge files, and
JavaScript integration code that calls Emboss's public API) is licensed under
AGPL-3.0. Emboss is a separate work bundled with Leantime, similar to how web
applications bundle third-party JavaScript libraries, fonts, or icon sets under
their own respective licenses.

The following files are Leantime AGPL-3.0 code (NOT part of Emboss):
- `app/Domain/Tickets/Services/EmbossAdapter.php`
- `public/assets/css/components/emboss-leantime-bridge.css`
- Any `.blade.php` templates that initialize or configure Emboss
- Any PHP controllers or services that prepare data for Emboss

The following files are Emboss commercial code (NOT covered by AGPL-3.0):
- All files in `public/assets/js/libs/emboss/`
