/* global i18next, i18nextBrowserLanguageDetector */
(function initUsporedbeI18nModule(global) {
    const STORAGE_KEY = 'usporedbeLang';
    const LOCALE_ASSET_VERSION = '20260329t';
    const SUPPORTED = ['en', 'hr', 'sl', 'sr'];
    const INTL_LOCALE_BY_LANG = Object.freeze({
        en: 'en-GB',
        hr: 'hr-HR',
        sl: 'sl-SI',
        sr: 'sr-Latn-RS'
    });

    let readyPromise = null;

    function getIntlLocale() {
        const lng = i18next.resolvedLanguage || i18next.language || 'hr';
        const base = String(lng).split('-')[0];
        return INTL_LOCALE_BY_LANG[base] || INTL_LOCALE_BY_LANG[lng] || 'en-GB';
    }

    function t(key, options) {
        return i18next.t(key, options);
    }

    function applyDomTranslations(root = document) {
        root.querySelectorAll('[data-i18n]').forEach((el) => {
            const key = el.getAttribute('data-i18n');
            if (!key) return;
            el.textContent = t(key);
        });
        root.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
            const key = el.getAttribute('data-i18n-placeholder');
            if (!key || !('placeholder' in el)) return;
            el.placeholder = t(key);
        });
        root.querySelectorAll('[data-i18n-aria]').forEach((el) => {
            const key = el.getAttribute('data-i18n-aria');
            if (!key) return;
            el.setAttribute('aria-label', t(key));
        });
        root.querySelectorAll('[data-i18n-title]').forEach((el) => {
            const key = el.getAttribute('data-i18n-title');
            if (!key) return;
            el.setAttribute('title', t(key));
        });
        root.querySelectorAll('[data-i18n-html]').forEach((el) => {
            const key = el.getAttribute('data-i18n-html');
            if (!key) return;
            el.innerHTML = t(key);
        });
        root.querySelectorAll('[data-i18n-alt]').forEach((el) => {
            const key = el.getAttribute('data-i18n-alt');
            if (!key || !('alt' in el)) return;
            el.alt = t(key);
        });
    }

    function updateHtmlLang() {
        const base = String(i18next.resolvedLanguage || 'hr').split('-')[0];
        document.documentElement.lang = base === 'sr' ? 'sr-Latn' : base;
    }

    function updateDocumentMeta() {
        const title = t('meta.title');
        if (title && title !== 'meta.title') {
            document.title = title;
        }
        const desc = t('meta.description');
        const metaDesc = document.querySelector('meta[name="description"]');
        if (metaDesc && desc && desc !== 'meta.description') {
            metaDesc.setAttribute('content', desc);
        }
    }

    async function loadTranslation(lng) {
        const response = await fetch(`./locales/${lng}.json?v=${LOCALE_ASSET_VERSION}`, { cache: 'no-cache' });
        if (!response.ok) {
            throw new Error(`Failed to load locale ${lng}: HTTP ${response.status}`);
        }
        return response.json();
    }

    function initUsporedbeI18n() {
        if (readyPromise) return readyPromise;

        readyPromise = (async () => {
            const [en, hr, sl, sr] = await Promise.all([
                loadTranslation('en'),
                loadTranslation('hr'),
                loadTranslation('sl'),
                loadTranslation('sr')
            ]);

            await i18next.use(i18nextBrowserLanguageDetector).init({
                resources: {
                    en: { translation: en },
                    hr: { translation: hr },
                    sl: { translation: sl },
                    sr: { translation: sr }
                },
                fallbackLng: 'hr',
                supportedLngs: SUPPORTED,
                nonExplicitSupportedLngs: true,
                interpolation: { escapeValue: false },
                detection: {
                    order: ['localStorage', 'navigator'],
                    caches: ['localStorage'],
                    lookupLocalStorage: STORAGE_KEY
                }
            });

            updateHtmlLang();
            applyDomTranslations();
            updateDocumentMeta();

            i18next.on('languageChanged', () => {
                global.localStorage?.setItem(STORAGE_KEY, i18next.resolvedLanguage);
                updateHtmlLang();
                applyDomTranslations();
                updateDocumentMeta();
                if (typeof global.onUsporedbeLanguageChanged === 'function') {
                    global.onUsporedbeLanguageChanged();
                }
            });

            return i18next;
        })();

        return readyPromise;
    }

    function changeLanguage(lng) {
        return i18next.changeLanguage(lng);
    }

    global.initUsporedbeI18n = initUsporedbeI18n;
    global.t = t;
    global.getIntlLocale = getIntlLocale;
    global.applyDomTranslations = applyDomTranslations;
    global.changeUsporedbeLanguage = changeLanguage;
    global.USPOREDBE_SUPPORTED_LANGS = SUPPORTED;
})(globalThis);
