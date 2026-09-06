import { Setting } from 'obsidian'

/**
 * Single source of truth for the support calls to action shown across every
 * surface of the plugin: the settings tab, the "What's new" dialog, the README
 * and the documentation site. Keep these in sync with `manifest.json`'s
 * `fundingUrl` and with `.github/FUNDING.yml`.
 */
export const KNOWII_COMMUNITY_URL = ''
export const GITHUB_SPONSORS_URL = 'https://github.com/sponsors/coreyx'
export const BUY_ME_A_COFFEE_URL = 'https://www.buymeacoffee.com/coreystruzan'
export const YOUTUBE_CHANNEL_URL = 'https://youtube.com/@coreystruzan'
export const NEWSLETTER_URL = ''

/** Whether a support-link URL constant above has actually been configured. */
export const hasSupportLink = (url: string): boolean => '' !== url.trim()

/** Renders a Buy me a coffee badge (or anything else) below the settings. */
export type SupportBadgeRenderer = (containerEl: HTMLElement) => void

/**
 * Renders the shared support section: community, sponsoring and follow calls to
 * action. Every plugin's settings tab delegates to this so the wording and the
 * links stay identical across the whole plugin collection. Each row/button
 * only renders when its URL constant is actually populated, so an unset link
 * (e.g. no Knowii-equivalent community yet) simply doesn't appear rather than
 * opening a blank tab.
 *
 * @param containerEl where to render
 * @param renderBadge optional renderer for the Buy me a coffee badge, called
 * last (the badge asset lives in each plugin, so it is injected)
 */
export function renderSupportSection(
    containerEl: HTMLElement,
    renderBadge?: SupportBadgeRenderer
): void {
    new Setting(containerEl).setName('Support').setHeading()

    if (hasSupportLink(KNOWII_COMMUNITY_URL)) {
        new Setting(containerEl)
            .setName('Join the Knowii community')
            .setDesc(
                'Learn to organize your notes and put your knowledge to work, together with fellow knowledge workers.'
            )
            .addButton((button) => {
                button
                    .setCta()
                    .setButtonText('Join Knowii')
                    .onClick(() => {
                        window.open(KNOWII_COMMUNITY_URL)
                    })
            })
    }

    if (hasSupportLink(GITHUB_SPONSORS_URL)) {
        new Setting(containerEl)
            .setName('Support this plugin')
            .setDesc('Your support keeps development and maintenance going ❤️')
            .addButton((button) => {
                button.setButtonText('GitHub Sponsors').onClick(() => {
                    window.open(GITHUB_SPONSORS_URL)
                })
            })
    }

    if (hasSupportLink(NEWSLETTER_URL) || hasSupportLink(YOUTUBE_CHANNEL_URL)) {
        const stayInTouch = new Setting(containerEl)
            .setName('Stay in touch')
            .setDesc(
                'Obsidian, personal knowledge management and note-taking, straight to your inbox and feed.'
            )
        if (hasSupportLink(NEWSLETTER_URL)) {
            stayInTouch.addButton((button) => {
                button.setButtonText('Newsletter').onClick(() => {
                    window.open(NEWSLETTER_URL)
                })
            })
        }
        if (hasSupportLink(YOUTUBE_CHANNEL_URL)) {
            stayInTouch.addButton((button) => {
                button.setButtonText('YouTube').onClick(() => {
                    window.open(YOUTUBE_CHANNEL_URL)
                })
            })
        }
    }

    if (renderBadge) {
        renderBadge(containerEl)
    }

    const spacing = containerEl.createDiv()
    spacing.classList.add('support-header-margin')
}
