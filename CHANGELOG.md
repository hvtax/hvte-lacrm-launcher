# Changelog

## 1.0.2

- Menu: removed Invoice and Record (Tom). Added "Set Up New Client", which opens the SetUpNewClient Cognito form prefilled with the household ID; that form's Zap adds the household to the LACRM group "7.02 Setup HH as new client/prospect" to kick off the new-client setup workflow.

## 1.0.1

- Fix: removed the page-realm history (pushState/replaceState) wrapping added in 1.0.0, which interfered with Less Annoying CRM's own link handling and made LACRM links unresponsive to left-clicks. In-page navigation is still tracked by the location poll, and actions still re-read the current URL at click time.

## 1.0.0

- Initial Firefox launcher with three owner-specified actions, Copy ContactId, and click-time contact checks.
