const PRODUCTION_API_BASE = window.location.origin;
const LOCAL_API_BASE = 'http://localhost:3001';
const APP_PATH_MARKER = '/liga';
const APP_BASE_PATH = inferAppBasePath(window.location.pathname);
const REQUESTED_HOME_CITY_SLUG = getRequestedHomeCitySlug(window.location.pathname);
const DEFAULT_CITY = 'Zagreb';
const DEFAULT_CITY_SET = ['Zagreb', 'Ljubljana', 'Belgrade', 'Budapest', 'Bratislava', 'Prague', 'Vienna'];
const MATCH_RENDER_BATCH = 20;
const CITY_LANG = Object.freeze({
    Zagreb: 'hr',
    Ljubljana: 'sl',
    Belgrade: 'sr',
    Sarajevo: 'hr',
});
/** URL slug aliases → canonical API city id (locale-independent). */
const CITY_SLUG_ALIASES = Object.freeze([
    ['Athens', 'Athens'],
    ['Belgrade', 'Belgrade'],
    ['Beograd', 'Belgrade'],
    ['Berlin', 'Berlin'],
    ['Bratislava', 'Bratislava'],
    ['Bucharest', 'Bucharest'],
    ['Budapest', 'Budapest'],
    ['Krakow', 'Krakow-Cracow'],
    ['Krakow-Cracow', 'Krakow-Cracow'],
    ['Ljubljana', 'Ljubljana'],
    ['London', 'London'],
    ['Milan', 'Milan'],
    ['Paris', 'Paris'],
    ['Prague', 'Prague'],
    ['Sarajevo', 'Sarajevo'],
    ['Sofia', 'Sofia'],
    ['Vienna', 'Vienna'],
    ['Warsaw', 'Warsaw'],
    ['Wroclaw', 'Wroclaw'],
    ['zagreb', 'Zagreb'],
    ['Zagreb', 'Zagreb']
]);

const CITY_EMBLEMS = Object.freeze({
    Athens: 'emblems/athens.png',
    Belgrade: 'emblems/belgrade.png',
    Beograd: 'emblems/belgrade.png',
    Berlin: 'emblems/berlin.png',
    Bratislava: 'emblems/bratislava.png',
    Bucharest: 'emblems/bucharest.png',
    Budapest: 'emblems/budapest.png',
    Krakow: 'emblems/krakow.png',
    'Krakow-Cracow': 'emblems/krakow.png',
    Ljubljana: 'emblems/ljubljana.png',
    London: 'emblems/london.png',
    Milan: 'emblems/milan.png',
    Paris: 'emblems/paris.png',
    Prague: 'emblems/prague.png',
    Sarajevo: 'emblems/sarajevo.png',
    Sofia: 'emblems/sofia.png',
    Vienna: 'emblems/vienna.png',
    Warsaw: 'emblems/warsaw.png',
    Wroclaw: 'emblems/wroclaw.png',
    zagreb: 'emblems/zagreb.png',
    Zagreb: 'emblems/zagreb.png',
});

function getCityEmblem(city) {
    return CITY_EMBLEMS[city] || '';
}

function inferAppBasePath(pathname) {
    const normalizedPath = String(pathname || '/');
    const markerIndex = normalizedPath.toLowerCase().indexOf(APP_PATH_MARKER);
    if (markerIndex === -1) return '/';

    const basePath = normalizedPath.slice(0, markerIndex + APP_PATH_MARKER.length);
    return basePath.endsWith('/') ? basePath : `${basePath}/`;
}

function normalizeCitySlug(value) {
    return String(value || '')
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/gi, '-')
        .replace(/^-+|-+$/g, '')
        .toLowerCase();
}

function getRequestedHomeCitySlug(pathname) {
    const normalizedPath = String(pathname || '/');
    const relativePath = normalizedPath.startsWith(APP_BASE_PATH)
        ? normalizedPath.slice(APP_BASE_PATH.length)
        : normalizedPath.replace(/^\/+/, '');
    const [slug = ''] = relativePath.split('/').filter(Boolean);
    return normalizeCitySlug(slug);
}

function buildAppPath(pathname = '') {
    const normalizedPath = String(pathname || '').replace(/^\/+/, '');
    return normalizedPath ? `${APP_BASE_PATH}${normalizedPath}` : APP_BASE_PATH;
}

const METRIC_DATA = globalThis.NUMBEO_METRIC_DATA;

if (!METRIC_DATA || !Array.isArray(METRIC_DATA.metrics)) {
    throw new Error('NUMBEO_METRIC_DATA is missing.');
}

const ITEM_VARIANTS_BY_ITEM = METRIC_DATA.itemVariantsByItem || {};
const METRICS = METRIC_DATA.metrics;
const DERIVED_METRICS = Array.isArray(METRIC_DATA.derivedMetrics) ? METRIC_DATA.derivedMetrics : [];
const ALL_METRICS = [...METRICS, ...DERIVED_METRICS];
const METRIC_BY_KEY = new Map(ALL_METRICS.map(metric => [metric.key, metric]));
const METRIC_BY_CANONICAL_ITEM = new Map(METRICS.map(metric => [metric.canonicalItem, metric]));

const COLORS = ['#b8572a', '#2f6f5f', '#b08a24', '#7c5b8f', '#1a5f9c', '#9b3d3d', '#5b6c2b', '#0f766e'];
const MATCH_CHART_COLORS = ['#b8572a', '#2f6f5f'];
const SMOOTH_LINE_STYLE = Object.freeze({
    cubicInterpolationMode: 'monotone',
    tension: 0.4,
    borderCapStyle: 'round',
    borderJoinStyle: 'round'
});
const FOOTBALL_POINT_STYLE_SRC = './football-ball.svg';
const FOOTBALL_POINT_STYLE = createFootballPointStyle();
const GOAL_MARKER_PLUGIN = {
    id: 'goalMarker',
    afterDatasetsDraw(chart, _args, pluginOptions) {
        const marker = pluginOptions || {};
        if (!Number.isFinite(marker.xValue) || !Number.isFinite(marker.yValue)) return;

        const xScale = chart.scales.x;
        const yScale = chart.scales.y;
        if (!xScale || !yScale) return;

        const x = xScale.getPixelForValue(marker.xValue);
        const y = yScale.getPixelForValue(marker.yValue);
        if (!Number.isFinite(x) || !Number.isFinite(y)) return;

        const ctx = chart.ctx;
        const size = Number.isFinite(marker.size) ? marker.size : 12;
        const half = size / 2;
        // Snap to integer pixels so the image centre lands exactly on (x, y)
        const cx = Math.round(x);
        const cy = Math.round(y);

        ctx.save();
        if (FOOTBALL_POINT_STYLE && FOOTBALL_POINT_STYLE.width && FOOTBALL_POINT_STYLE.height) {
            ctx.drawImage(FOOTBALL_POINT_STYLE, cx - half, cy - half, size, size);
        } else {
            ctx.beginPath();
            ctx.arc(cx, cy, half - 1, 0, Math.PI * 2);
            ctx.fillStyle = '#ffffff';
            ctx.fill();
            ctx.lineWidth = 1;
            ctx.strokeStyle = '#1d2a1d';
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(cx, cy, Math.max(1.2, size / 6), 0, Math.PI * 2);
            ctx.fillStyle = '#1d2a1d';
            ctx.fill();
        }
        ctx.restore();
    }
};

const state = {
    cities: [],
    cityBySlug: new Map(),
    citySlugs: new Map(),
    defaultSelectedCities: [],
    matches: [],
    visibleMatches: [],
    renderedMatchCount: 0,
    matchSentinelObserver: null,
    matchGoalChartData: new Map(),
    matchGoalCharts: new Map(),
    pendingMatchGoalRequests: new Map(),
    rowsByMetric: new Map(),
    standingsRows: [],
    standingsMeta: null,
    selectedCities: [],
    focusCity: DEFAULT_CITY,
    matchesFilterCity: '',
    metricKey: METRICS[0].key,
    isBootstrapping: true,
    loadingMatches: false,
    loadingMetricKey: null,
    loadingStandings: false,
    trendChart: null,
    comparisonChart: null,
    chartSectionVisible: false,
    chartsDirty: true,
    chartSectionObserver: null
};

function withSmoothLineStyle(dataset) {
    return {
        ...SMOOTH_LINE_STYLE,
        ...dataset
    };
}

function createFootballPointStyle() {
    const sourceSize = 96;
    const center = sourceSize / 2;
    const markerCanvas = document.createElement('canvas');
    markerCanvas.width = sourceSize;
    markerCanvas.height = sourceSize;

    const context = markerCanvas.getContext('2d');

    const drawFallbackMarker = () => {
        if (!context) return;
        context.clearRect(0, 0, markerCanvas.width, markerCanvas.height);
        context.beginPath();
        context.arc(center, center, sourceSize * 0.38, 0, Math.PI * 2);
        context.fillStyle = '#ffffff';
        context.fill();
        context.lineWidth = 6;
        context.strokeStyle = '#1d2a1d';
        context.stroke();

        context.beginPath();
        context.arc(center, center, sourceSize * 0.135, 0, Math.PI * 2);
        context.fillStyle = '#1d2a1d';
        context.fill();
    };

    drawFallbackMarker();

    const image = new Image();
    image.onload = () => {
        if (!context) return;
        context.clearRect(0, 0, markerCanvas.width, markerCanvas.height);
        context.drawImage(image, 0, 0, markerCanvas.width, markerCanvas.height);

        if (typeof state !== 'undefined') {
            for (const chart of state.matchGoalCharts.values()) {
                chart.update();
            }
        }
    };
    image.onerror = () => {
        drawFallbackMarker();

        if (typeof state !== 'undefined') {
            for (const chart of state.matchGoalCharts.values()) {
                chart.update();
            }
        }
    };
    image.src = FOOTBALL_POINT_STYLE_SRC;
    return markerCanvas;
}

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function getApiBase() {
    const hostname = window.location.hostname.toLowerCase();
    if (!hostname || hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0') {
        return LOCAL_API_BASE;
    }
    return PRODUCTION_API_BASE;
}

function registerCitySlug(cityBySlug, rawValue, city) {
    const slug = normalizeCitySlug(rawValue);
    if (!slug || cityBySlug.has(slug)) return;
    cityBySlug.set(slug, city);
}

function buildCitySlugMaps(cities) {
    const cityBySlug = new Map();
    const citySlugs = new Map();

    cities.forEach(city => {
        const primarySlug = normalizeCitySlug(city);
        if (primarySlug) {
            citySlugs.set(city, primarySlug);
            cityBySlug.set(primarySlug, city);
        }
    });

    for (const [raw, canonicalCity] of CITY_SLUG_ALIASES) {
        if (!cities.includes(canonicalCity)) continue;
        registerCitySlug(cityBySlug, raw, canonicalCity);
    }

    return { cityBySlug, citySlugs };
}

function getCitySlug(city) {
    return state.citySlugs.get(city) || normalizeCitySlug(city);
}

function metricKeyToSlug(key) {
    return String(key || '').replace(/_/g, '-');
}

function metricSlugToKey(slug) {
    return String(slug || '').replace(/-/g, '_');
}

function getMetricSlugFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get('metric') || '';
}

function syncMetricPath() {
    const slug = metricKeyToSlug(state.metricKey);
    const defaultSlug = metricKeyToSlug(METRICS[0].key);
    const params = new URLSearchParams(window.location.search);

    if (slug && slug !== defaultSlug) {
        params.set('metric', slug);
    } else {
        params.delete('metric');
    }

    const search = params.toString() ? `?${params.toString()}` : '';
    const nextUrl = `${window.location.pathname}${search}${window.location.hash || ''}`;
    const currentUrl = `${window.location.pathname}${window.location.search || ''}${window.location.hash || ''}`;

    if (nextUrl !== currentUrl) {
        history.replaceState(null, '', nextUrl);
    }
}

function syncFocusCityPath() {
    const nextPath = buildAppPath(getCitySlug(state.focusCity));
    const nextUrl = `${nextPath}${window.location.search || ''}${window.location.hash || ''}`;
    const currentUrl = `${window.location.pathname}${window.location.search || ''}${window.location.hash || ''}`;

    if (nextUrl !== currentUrl) {
        history.replaceState(null, '', nextUrl);
    }
}

function formatDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value || '-';
    return new Intl.DateTimeFormat(getIntlLocale(), { year: 'numeric', month: 'short', day: 'numeric' }).format(date);
}

function formatMetricValue(value, metric = getCurrentMetric()) {
    if (!Number.isFinite(value)) return '-';
    const loc = getIntlLocale();
    if (metric.format === 'currency') {
        return new Intl.NumberFormat(loc, { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 }).format(value);
    }
    if (metric.format === 'percent') {
        return `${new Intl.NumberFormat(loc, { maximumFractionDigits: 2 }).format(value)}%`;
    }
    return new Intl.NumberFormat(loc, { maximumFractionDigits: 2 }).format(value);
}

function formatSignedNumber(value) {
    if (!Number.isFinite(value)) return '-';
    return `${value > 0 ? '+' : ''}${new Intl.NumberFormat(getIntlLocale(), { maximumFractionDigits: 0 }).format(value)}`;
}

function formatGoalMinute(goalAt, firstAt, lastAt) {
    const goalTime = new Date(goalAt).getTime();
    const startTime = new Date(firstAt).getTime();
    const endTime = new Date(lastAt).getTime();

    if (!Number.isFinite(goalTime) || !Number.isFinite(startTime) || !Number.isFinite(endTime) || endTime <= startTime) {
        return 90;
    }

    const ratio = (goalTime - startTime) / (endTime - startTime);
    const clampedRatio = Math.max(0, Math.min(1, ratio));
    return Math.max(1, Math.min(90, Math.round(clampedRatio * 89) + 1));
}

function getFormResultClass(result) {
    if (result === 'W') return 'win';
    if (result === 'L') return 'loss';
    return 'draw';
}

function getFormResultLabel(result) {
    if (result === 'W') return t('form.win');
    if (result === 'L') return t('form.loss');
    return t('form.draw');
}

function isFocusMatch(match) {
    return match.city_a === state.focusCity || match.city_b === state.focusCity;
}

function parseNumericValue(raw) {
    if (raw === undefined || raw === null) return null;
    const normalized = String(raw).replace(/\u00a0/g, ' ').replace(/[€£$]/g, '').replace(/,/g, '').trim();
    const match = normalized.match(/-?\d+(?:\.\d+)?/);
    if (!match) return null;
    const value = Number(match[0]);
    return Number.isFinite(value) ? value : null;
}

function getCurrentMetric() {
    return METRIC_BY_KEY.get(state.metricKey) || METRICS[0];
}

function getMetricMeta(metricKey, metricLabel = metricKey) {
    const knownMetric = METRIC_BY_KEY.get(metricKey);
    if (knownMetric) return knownMetric;

    const lowerKey = String(metricKey || '').toLowerCase();
    const lowerText = `${String(metricKey || '')} ${String(metricLabel || '')}`.toLowerCase();
    const isPercentMetric = ['share', 'percent', 'percentage', 'pct', 'burden']
        .some(keyword => lowerText.includes(keyword));
    const format = isPercentMetric
        ? 'percent'
        : (lowerText.includes('salary') || lowerText.includes('rent') ? 'currency' : 'number');
    const better = lowerKey.includes('burden') || lowerKey.includes('ratio') || lowerKey.includes('rate') ? 'lower' : 'higher';

    return {
        key: metricKey,
        label: metricLabel,
        format,
        better
    };
}

function getCityLabel(city) {
    return t(`cities.${city}`, { defaultValue: city });
}

function getMetricDisplayLabel(metric) {
    if (!metric || !metric.key) return '';
    return t(`metrics.${metric.key}`, { defaultValue: metric.label });
}

function goalMetricDisplayLabel(goal) {
    if (!goal.metric_key) return goal.metric_label || '';
    const meta = getMetricMeta(goal.metric_key, goal.metric_label);
    return getMetricDisplayLabel(meta);
}

function getItemVariantMeta(item) {
    return ITEM_VARIANTS_BY_ITEM[item] || { canonicalItem: item, valueMultiplier: 1 };
}

function itemPriceMap(rawData) {
    const pairs = Array.isArray(rawData?.prices) ? rawData.prices : [];
    const values = new Map();
    const rowCurrency = rawData?.currency || null;

    for (const entry of pairs) {
        const variant = getItemVariantMeta(entry.item);
        const metric = METRIC_BY_CANONICAL_ITEM.get(variant.canonicalItem);
        if (!metric) continue;

        let numeric = null;

        if (Number.isFinite(entry.price_eur)) {
            numeric = entry.price_eur * variant.valueMultiplier;
        } else if (metric.format !== 'currency') {
            numeric = parseNumericValue(entry.price);
        } else if (!rowCurrency || rowCurrency === 'EUR') {
            const parsed = parseNumericValue(entry.price);
            numeric = Number.isFinite(parsed) ? parsed * variant.valueMultiplier : null;
        }

        if (Number.isFinite(numeric)) {
            values.set(metric.key, numeric);
        }
    }

    return values;
}

function normalizeRows(rows, metricKey) {
    return rows.map(row => {
        if (Number.isFinite(row.value_eur) || Number.isFinite(row.value)) {
            const numericValue = Number.isFinite(row.value_eur) ? row.value_eur : row.value;
            const values = new Map();

            if (Number.isFinite(numericValue)) {
                values.set(metricKey, numericValue);
            }

            return {
                city: row.city,
                updatedAt: row.updated_at,
                values
            };
        }

        const prices = itemPriceMap(row.raw_data);
        return {
            city: row.city,
            updatedAt: row.updated_at,
            values: prices
        };
    });
}

function groupByCity(rows) {
    const grouped = new Map();
    for (const row of rows) {
        if (!grouped.has(row.city)) grouped.set(row.city, []);
        grouped.get(row.city).push(row);
    }
    for (const entry of grouped.values()) {
        entry.sort((a, b) => new Date(a.updatedAt) - new Date(b.updatedAt));
    }
    return grouped;
}

function getRowsForMetric(metricKey) {
    return state.rowsByMetric.get(metricKey) || [];
}

function getSeriesForCityFromRows(rows, city, metricKey) {
    const grouped = groupByCity(rows);
    const cityRows = grouped.get(city) || [];
    return cityRows
        .map(row => ({ x: row.updatedAt, y: row.values.get(metricKey) }))
        .filter(point => Number.isFinite(point.y));
}

function getSeriesForCity(city, metricKey) {
    return getSeriesForCityFromRows(getRowsForMetric(metricKey), city, metricKey);
}

function getSelectedDateLabels(metricKey) {
    const labels = new Set();
    for (const city of state.selectedCities) {
        for (const point of getSeriesForCity(city, metricKey)) {
            labels.add(point.x);
        }
    }
    return Array.from(labels).sort((a, b) => new Date(a) - new Date(b));
}

function computeLatestComparison(metricKey) {
    return state.selectedCities
        .map(city => {
            const series = getSeriesForCity(city, metricKey);
            const latest = series[series.length - 1] || null;
            const first = series[0] || null;
            const delta = latest && first ? ((latest.y - first.y) / first.y) * 100 : null;
            return {
                city,
                latestDate: latest?.x || null,
                latestValue: latest?.y ?? null,
                deltaPct: Number.isFinite(delta) ? delta : null
            };
        })
        .filter(entry => Number.isFinite(entry.latestValue));
}

function getSelectedSeriesPoints(metricKey) {
    return state.selectedCities.flatMap(city => getSeriesForCity(city, metricKey));
}

function rankFocusCity(entries, metric) {
    const sorted = [...entries].sort((a, b) => metric.better === 'lower' ? a.latestValue - b.latestValue : b.latestValue - a.latestValue);
    const index = sorted.findIndex(entry => entry.city === state.focusCity);
    return { rank: index >= 0 ? index + 1 : null, total: sorted.length };
}

function getDeltaClass(deltaPct, metric) {
    if (!Number.isFinite(deltaPct) || deltaPct === 0) return 'neutral';
    if (metric.better === 'lower') {
        return deltaPct < 0 ? 'positive' : 'negative';
    }
    return deltaPct > 0 ? 'positive' : 'negative';
}

function updateSummary(entries) {
    const metric = getCurrentMetric();
    const focusEntry = entries.find(entry => entry.city === state.focusCity) || null;
    const rank = rankFocusCity(entries, metric);

    const changeEl = document.getElementById('summary-change');
    const changeDetailEl = document.getElementById('summary-change-detail');
    const latestEl = document.getElementById('summary-latest');
    const latestDetailEl = document.getElementById('summary-latest-detail');
    const rankEl = document.getElementById('summary-rank');
    const rankDetailEl = document.getElementById('summary-rank-detail');

    if (!focusEntry) {
        changeEl.textContent = '-';
        changeEl.className = '';
        changeDetailEl.textContent = t('summary.no_focus_data');
        latestEl.textContent = '-';
        latestDetailEl.textContent = '-';
        rankEl.textContent = '-';
        rankDetailEl.textContent = '-';
        return;
    }

    changeEl.textContent = Number.isFinite(focusEntry.deltaPct) ? `${focusEntry.deltaPct > 0 ? '+' : ''}${focusEntry.deltaPct.toFixed(1)}%` : '-';
    changeEl.className = getDeltaClass(focusEntry.deltaPct, metric);
    changeDetailEl.textContent = t('summary.change_detail', { city: getCityLabel(state.focusCity) });

    latestEl.textContent = formatMetricValue(focusEntry.latestValue, metric);
    latestDetailEl.textContent = focusEntry.latestDate ? t('summary.latest_reading', { date: formatDate(focusEntry.latestDate) }) : '-';

    rankEl.textContent = rank.rank ? `${rank.rank}. / ${rank.total}` : '-';
    rankDetailEl.textContent = t('summary.rank_detail', { city: getCityLabel(state.focusCity), metric: getMetricDisplayLabel(metric) });
}

function updateHero(entries) {
    const metric = getCurrentMetric();
    const points = getSelectedSeriesPoints(metric.key).sort((left, right) => new Date(left.x) - new Date(right.x));
    const latestDates = entries
        .map(entry => entry.latestDate)
        .filter(Boolean)
        .sort((left, right) => new Date(left) - new Date(right));

    document.getElementById('hero-selected-count').textContent = state.cities.length ? `${state.cities.length}` : '-';
    document.getElementById('hero-timespan').textContent = points.length
        ? `${formatDate(points[0].x)} - ${formatDate(points[points.length - 1].x)}`
        : '-';
    document.getElementById('hero-updated-at').textContent = latestDates.length ? formatDate(latestDates[latestDates.length - 1]) : '-';
}

function renderStandings() {
    const wrap = document.getElementById('standings-table-wrap');
    const body = document.getElementById('standings-table-body');
    const emptyEl = document.getElementById('standings-empty');
    const rows = state.standingsRows || [];

    if (rows.length < 2) {
        body.innerHTML = '';
        wrap.hidden = true;
        emptyEl.hidden = false;
        return;
    }

    wrap.hidden = false;
    emptyEl.hidden = true;
    body.innerHTML = rows.map(row => `
        <tr class="standings-row${row.city === state.focusCity ? ' is-focus' : ''}" data-city="${escapeHtml(row.city)}">
            <td data-label="${escapeHtml(t('standings.th_pos'))}">${row.position}</td>
            <td data-label="${escapeHtml(t('standings.th_city'))}"><span class="city-name-with-emblem">${getCityEmblem(row.city) ? `<img class="city-emblem" src="./${getCityEmblem(row.city)}" alt="" width="20" height="20">` : ''}${escapeHtml(getCityLabel(row.city))}</span></td>
            <td data-label="${escapeHtml(t('standings.th_pts'))}">${row.points}</td>
            <td data-label="${escapeHtml(t('standings.th_w'))}">${row.won}</td>
            <td data-label="${escapeHtml(t('standings.th_d'))}">${row.drawn}</td>
            <td data-label="${escapeHtml(t('standings.th_l'))}">${row.lost}</td>
            <td data-label="${escapeHtml(t('standings.th_gf'))}">${row.goals_for}</td>
            <td data-label="${escapeHtml(t('standings.th_ga'))}">${row.goals_against}</td>
            <td data-label="${escapeHtml(t('standings.th_gd'))}">${formatSignedNumber(row.goal_difference)}</td>
            <td data-label="${escapeHtml(t('standings.th_am'))}">${row.active_matches}</td>
            <td data-label="${escapeHtml(t('standings.th_l5'))}"><span class="form-icons">${(Array.isArray(row.form) ? row.form : []).map(formEntry => {
        const opponentLabel = getCityLabel(formEntry.opponent);
        const label = getFormResultLabel(formEntry.result);
        const playedAt = formEntry.played_at ? formatDate(formEntry.played_at) : '-';
        const tip = t('form.tooltip', {
            result: label,
            opponent: opponentLabel,
            scored: formEntry.scored,
            conceded: formEntry.conceded,
            date: playedAt
        });
        return `<span class="form-icon ${getFormResultClass(formEntry.result)}" title="${escapeHtml(tip)}">${formEntry.result}</span>`;
    }).join('')}</span></td>
        </tr>
    `).join('');

    document.querySelectorAll('.standings-row').forEach(row => {
        row.addEventListener('click', () => {
            const city = row.dataset.city;
            const select = document.getElementById('matches-city-filter');
            select.value = city;
            state.matchesFilterCity = city;
            renderMatches();
            document.querySelector('.matches-panel').scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    });
}

function renderGoalTicker() {
    const ticker = document.getElementById('goal-ticker');
    const content = document.getElementById('goal-ticker-content');
    const matches = state.matches || [];

    const allGoals = [];
    matches.forEach((match, index) => {
        const matchKey = getMatchKey(match, index);
        const goals = Array.isArray(match.goals) ? match.goals : [];
        goals.forEach(goal => {
            allGoals.push({
                ...goal,
                matchKey,
                city_a: match.city_a,
                city_b: match.city_b,
                first_snapshot_at: match.first_snapshot_at,
                latest_snapshot_at: match.latest_snapshot_at,
            });
        });
    });

    allGoals.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
    const latest = allGoals.slice(0, 10);

    if (!latest.length) {
        ticker.hidden = true;
        return;
    }

    ticker.hidden = false;
    const items = latest.map(g => {
        const scorer = getCityLabel(g.scored_for);
        const opponent = g.scored_for === g.city_a ? getCityLabel(g.city_b) : getCityLabel(g.city_a);
        return `<a class="goal-ticker-item" href="#match-${escapeHtml(g.matchKey)}"><span class="goal-ticker-ball">⚽️</span><span class="goal-ticker-scorer">${escapeHtml(scorer)}</span><span class="goal-ticker-vs">${escapeHtml(t('matches.vs'))} ${escapeHtml(opponent)}</span><span>${escapeHtml(goalMetricDisplayLabel(g))}</span></a>`;
    });

    // Duplicate for seamless loop
    content.innerHTML = items.join('') + items.join('');

    content.querySelectorAll('.goal-ticker-item').forEach(link => {
        link.addEventListener('click', e => {
            e.preventDefault();
            const id = link.getAttribute('href').slice(1);
            history.replaceState(null, '', `#${id}`);
            const el = document.getElementById(id);
            if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                el.classList.add('is-highlight');
                setTimeout(() => el.classList.remove('is-highlight'), 2000);
            }
        });
    });
}

function buildMatchCardHtml(match) {
    const matchKey = getMatchKey(match);
    const cityALabel = getCityLabel(match.city_a);
    const cityBLabel = getCityLabel(match.city_b);
    const scoreA = Number(match.score?.[match.city_a] || 0);
    const scoreB = Number(match.score?.[match.city_b] || 0);
    const events = Array.isArray(match.goals) ? [...match.goals].sort((left, right) => new Date(left.updated_at) - new Date(right.updated_at)) : [];
    const chevronSvg = '<svg class="match-event-chevron" width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 6l4 4 4-4"/></svg>';
    const eventMarkup = events.length
        ? events.map((goal, goalIndex) => {
            const minute = formatGoalMinute(goal.updated_at, match.first_snapshot_at, match.latest_snapshot_at);
            return `
                <button type="button" class="match-event" data-goal-index="${goalIndex}" data-match-key="${escapeHtml(matchKey)}">
                    <span class="match-minute">${minute}'</span>
                    <span class="match-scorer-city">${escapeHtml(getCityLabel(goal.scored_for))}</span>
                    <span>${escapeHtml(goalMetricDisplayLabel(goal))}</span>
                    ${chevronSvg}
                </button>
                <div class="match-event-chart-inline" data-goal-index="${goalIndex}">
                    <canvas hidden></canvas>
                    <div class="match-chart-empty">${escapeHtml(t('matches_ui.chart_loading'))}</div>
                </div>
            `;
        }).join('')
        : `<div class="match-no-goals">${escapeHtml(t('matches_ui.no_goals'))}</div>`;

    const chartPanelMarkup = events.length
        ? `
            <div class="match-chart-panel" data-match-key="${escapeHtml(matchKey)}">
                <div class="match-chart-copy">
                    <p class="match-chart-kicker">${escapeHtml(t('matches_ui.chart_kicker'))}</p>
                    <h3 class="match-chart-title">${escapeHtml(t('matches_ui.chart_title_has_goals'))}</h3>
                    <p class="match-chart-meta">${escapeHtml(t('matches_ui.chart_meta_has_goals'))}</p>
                </div>
                <div class="match-chart-wrap">
                    <canvas class="match-chart-canvas" hidden></canvas>
                    <div class="empty-state match-chart-empty">${escapeHtml(t('matches_ui.chart_empty_pick'))}</div>
                </div>
            </div>
        `
        : `
            <div class="match-chart-panel is-empty">
                <div class="match-chart-copy">
                    <p class="match-chart-kicker">${escapeHtml(t('matches_ui.chart_kicker'))}</p>
                    <h3 class="match-chart-title">${escapeHtml(t('matches_ui.chart_title_no_goals'))}</h3>
                    <p class="match-chart-meta">${escapeHtml(t('matches_ui.chart_meta_no_goals'))}</p>
                </div>
            </div>
        `;

    const cityAIsHome = match.city_a === state.focusCity;
    const cityBIsHome = match.city_b === state.focusCity;
    const cityAName = cityAIsHome
        ? escapeHtml(cityALabel)
        : `<a href="#" class="match-opponent-link" data-city="${escapeHtml(match.city_a)}">${escapeHtml(cityALabel)}</a>`;
    const cityBName = cityBIsHome
        ? escapeHtml(cityBLabel)
        : `<a href="#" class="match-opponent-link" data-city="${escapeHtml(match.city_b)}">${escapeHtml(cityBLabel)}</a>`;

    return `
        <article class="match-card${isFocusMatch(match) ? ' is-focus' : ''}" id="match-${escapeHtml(matchKey)}" data-match-key="${escapeHtml(matchKey)}">
            <div class="match-scoreline">
                <div class="match-team home">${getCityEmblem(match.city_a) ? `<img class="city-emblem" src="./${getCityEmblem(match.city_a)}" alt="" width="18" height="18" loading="lazy">` : ''}${cityAName}</div>
                <div class="match-score">${scoreA} : ${scoreB}</div>
                <div class="match-team away">${cityBName}${getCityEmblem(match.city_b) ? `<img class="city-emblem" src="./${getCityEmblem(match.city_b)}" alt="" width="18" height="18" loading="lazy">` : ''}</div>
                <button type="button" class="match-link-btn" data-match-key="${escapeHtml(matchKey)}" title="${escapeHtml(t('matches_ui.copy_link_title'))}" aria-label="${escapeHtml(t('matches_ui.copy_link_aria'))}">
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M6.5 8.5a3 3 0 0 0 4.2.4l2-2a3 3 0 0 0-4.2-4.3l-1.2 1.1"/>
                        <path d="M9.5 7.5a3 3 0 0 0-4.2-.4l-2 2a3 3 0 0 0 4.2 4.3l1.1-1.1"/>
                    </svg>
                    <span class="match-link-label">${escapeHtml(t('matches_ui.link'))}</span>
                </button>
            </div>
            <div class="match-meta">
                <span>${formatDate(match.first_snapshot_at)} - ${formatDate(match.latest_snapshot_at)}</span>
            </div>
            <div class="match-body">
                <div class="match-events">${eventMarkup}</div>
                ${chartPanelMarkup}
            </div>
        </article>
    `;
}

function renderMatches() {
    const listEl = document.getElementById('matches-list');
    const emptyEl = document.getElementById('matches-empty');
    state.visibleMatches = getVisibleMatches();

    destroyMatchGoalCharts();
    state.renderedMatchCount = 0;
    if (state.matchSentinelObserver) {
        state.matchSentinelObserver.disconnect();
        state.matchSentinelObserver = null;
    }

    if (!state.visibleMatches.length) {
        listEl.innerHTML = '';
        listEl.hidden = true;
        emptyEl.hidden = false;
        return;
    }

    listEl.hidden = false;
    emptyEl.hidden = true;
    listEl.innerHTML = '';
    renderNextMatchBatch();
}

function renderNextMatchBatch() {
    const listEl = document.getElementById('matches-list');
    const matches = state.visibleMatches;
    const start = state.renderedMatchCount;
    const end = Math.min(start + MATCH_RENDER_BATCH, matches.length);
    const batch = matches.slice(start, end);

    const oldSentinel = listEl.querySelector('.matches-sentinel');
    if (oldSentinel) oldSentinel.remove();

    const html = batch.map(match => buildMatchCardHtml(match)).join('');
    listEl.insertAdjacentHTML('beforeend', html);

    attachMatchGoalInteractions(batch);
    attachMatchLinkButtonsForBatch(batch);

    state.renderedMatchCount = end;

    if (end < matches.length) {
        const sentinel = document.createElement('div');
        sentinel.className = 'matches-sentinel';
        sentinel.setAttribute('aria-hidden', 'true');
        listEl.appendChild(sentinel);

        if (state.matchSentinelObserver) state.matchSentinelObserver.disconnect();
        state.matchSentinelObserver = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting) {
                state.matchSentinelObserver.disconnect();
                renderNextMatchBatch();
            }
        }, { root: listEl, rootMargin: '300px' });
        state.matchSentinelObserver.observe(sentinel);
    }
}

function attachMatchLinkButtonsForBatch(batch) {
    for (const match of batch) {
        const matchKey = getMatchKey(match);
        const card = document.getElementById(`match-${matchKey}`);
        if (!card) continue;

        const btn = card.querySelector('.match-link-btn');
        if (btn) {
            btn.addEventListener('click', event => {
                event.stopPropagation();
                const hash = `#match-${matchKey}`;
                history.replaceState(null, '', hash);
                navigator.clipboard.writeText(location.href).then(() => {
                    btn.classList.add('is-copied');
                    setTimeout(() => btn.classList.remove('is-copied'), 1500);
                }).catch(() => {});
            });
        }

        card.querySelectorAll('.match-opponent-link').forEach(link => {
            link.addEventListener('click', event => {
                event.preventDefault();
                const city = link.dataset.city;
                if (city && state.cities.includes(city)) {
                    setFocusCity(city);
                    document.querySelector('.standings-panel').scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            });
        });
    }
}

function scrollToMatchFromHash() {
    const hash = location.hash;
    if (!hash || !hash.startsWith('#match-')) return;
    const el = resolveMatchElementFromHash(hash);
    if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('is-highlight');
        setTimeout(() => el.classList.remove('is-highlight'), 2000);
    }
}

function getVisibleMatches() {
    const matches = state.matches || [];
    if (!state.matchesFilterCity) return matches;

    const filterLabel = getCityLabel(state.matchesFilterCity);
    return matches.filter(match => getCityLabel(match.city_a) === filterLabel || getCityLabel(match.city_b) === filterLabel);
}

function getMatchKey(match) {
    return `${normalizeCitySlug(match.city_a)}_${normalizeCitySlug(match.city_b)}`;
}

function resolveMatchElementFromHash(hash) {
    if (!hash || !hash.startsWith('#match-')) return null;

    const directId = hash.slice(1);
    const directMatch = document.getElementById(directId);
    if (directMatch) return directMatch;

    // Legacy: strip trailing __N index and try double-underscore format
    const legacyId = directId.replace(/__\d+$/, '');
    if (legacyId !== directId) {
        const legacyEl = document.getElementById(legacyId);
        if (legacyEl) {
            history.replaceState(null, '', `#${legacyId}`);
            return legacyEl;
        }
    }

    // Legacy: convert double-underscore uppercase keys to new format
    const parts = directId.replace(/^match-/, '').replace(/__\d+$/, '').split('__');
    if (parts.length === 2) {
        const newId = `match-${normalizeCitySlug(parts[0])}_${normalizeCitySlug(parts[1])}`;
        const newEl = document.getElementById(newId);
        if (newEl) {
            history.replaceState(null, '', `#${newId}`);
            return newEl;
        }
    }

    return null;
}

function destroyMatchGoalCharts() {
    for (const chart of state.matchGoalCharts.values()) {
        chart.destroy();
    }
    state.matchGoalCharts.clear();
}

async function loadMatchGoalMetricRows(match, goal) {
    const cacheKey = `${match.city_a}__${match.city_b}__${goal.metric_key}`;

    if (state.matchGoalChartData.has(cacheKey)) {
        return state.matchGoalChartData.get(cacheKey);
    }

    if (state.pendingMatchGoalRequests.has(cacheKey)) {
        return state.pendingMatchGoalRequests.get(cacheKey);
    }

    const request = fetchJson(`/city-stats/data?metric=${encodeURIComponent(goal.metric_key)}&cities=${encodeURIComponent(match.city_a)},${encodeURIComponent(match.city_b)}&allDays=1`)
        .then(rows => {
            const normalizedRows = normalizeRows(rows, goal.metric_key);
            state.matchGoalChartData.set(cacheKey, normalizedRows);
            state.pendingMatchGoalRequests.delete(cacheKey);
            return normalizedRows;
        })
        .catch(error => {
            state.pendingMatchGoalRequests.delete(cacheKey);
            throw error;
        });

    state.pendingMatchGoalRequests.set(cacheKey, request);
    return request;
}

function attachMatchGoalInteractions(matches) {
    matches.forEach((match) => {
        const matchKey = getMatchKey(match);
        const sortedGoals = Array.isArray(match.goals)
            ? [...match.goals].sort((left, right) => new Date(left.updated_at) - new Date(right.updated_at))
            : [];
        const card = document.querySelector(`.match-card[data-match-key="${CSS.escape(matchKey)}"]`);
        if (!card) return;

        const goalButtons = Array.from(card.querySelectorAll('.match-event[data-goal-index]'));
        if (!goalButtons.length) return;

        goalButtons.forEach(button => {
            const goalIndex = Number(button.dataset.goalIndex);
            const goal = sortedGoals[goalIndex];
            if (!goal) return;

            const activate = () => {
                const wasActive = button.classList.contains('is-active');
                card.querySelectorAll('.match-event.is-active').forEach(node => node.classList.remove('is-active'));
                card.querySelectorAll('.match-event-chart-inline.is-visible').forEach(node => node.classList.remove('is-visible'));

                if (wasActive) return; // collapse on re-click

                button.classList.add('is-active');
                const inlineChart = button.nextElementSibling;
                if (inlineChart && inlineChart.classList.contains('match-event-chart-inline')) {
                    inlineChart.classList.add('is-visible');
                }
                void showGoalChartForMatch(card, match, goal, matchKey);
            };

            button.addEventListener('click', activate);
            button.addEventListener('mouseenter', activate);
            button.addEventListener('focus', activate);
        });
    });
}

async function showGoalChartForMatch(card, match, goal, matchKey) {
    // Desktop side panel elements
    const chartPanel = card.querySelector('.match-chart-panel');
    const titleEl = chartPanel?.querySelector('.match-chart-title');
    const metaEl = chartPanel?.querySelector('.match-chart-meta');
    const panelCanvas = chartPanel?.querySelector('.match-chart-canvas');
    const panelEmpty = chartPanel?.querySelector('.match-chart-empty');

    // Inline chart element (for mobile / collapsible view)
    const activeButton = card.querySelector('.match-event.is-active');
    const inlineWrap = activeButton?.nextElementSibling?.classList.contains('match-event-chart-inline')
        ? activeButton.nextElementSibling : null;
    const inlineCanvas = inlineWrap?.querySelector('canvas');
    const inlineEmpty = inlineWrap?.querySelector('.match-chart-empty');

    const minute = formatGoalMinute(goal.updated_at, match.first_snapshot_at, match.latest_snapshot_at);
    const scorerLabel = getCityLabel(goal.scored_for);
    const metricMeta = getMetricMeta(goal.metric_key, goal.metric_label);
    const metricLabel = getMetricDisplayLabel(metricMeta);
    const requestToken = `${goal.metric_key}__${goal.updated_at}__${goal.scored_for}`;

    card.dataset.activeGoalToken = requestToken;

    if (chartPanel) {
        chartPanel.classList.add('is-loading');
        if (titleEl) titleEl.textContent = t('matches_ui.goal_title', { scorer: scorerLabel, metric: metricLabel });
        if (metaEl) metaEl.textContent = t('matches_ui.goal_meta_minute', { scorer: scorerLabel, minute });
        if (panelCanvas) panelCanvas.hidden = true;
        if (panelEmpty) { panelEmpty.hidden = false; panelEmpty.textContent = t('matches_ui.chart_loading'); }
    }
    if (inlineCanvas) inlineCanvas.hidden = true;
    if (inlineEmpty) { inlineEmpty.hidden = false; inlineEmpty.textContent = t('matches_ui.chart_loading'); }

    try {
        const rows = await loadMatchGoalMetricRows(match, goal);
        if (card.dataset.activeGoalToken !== requestToken) return;

        renderGoalChart(card, match, goal, rows, metricMeta, matchKey);
        if (chartPanel) chartPanel.classList.remove('is-loading');
    } catch (error) {
        if (card.dataset.activeGoalToken !== requestToken) return;

        const existingChart = state.matchGoalCharts.get(matchKey);
        if (existingChart) {
            existingChart.destroy();
            state.matchGoalCharts.delete(matchKey);
        }

        if (chartPanel) chartPanel.classList.remove('is-loading');
        if (panelCanvas) panelCanvas.hidden = true;
        if (panelEmpty) { panelEmpty.hidden = false; panelEmpty.textContent = t('matches_ui.chart_error'); }
        if (inlineCanvas) inlineCanvas.hidden = true;
        if (inlineEmpty) { inlineEmpty.hidden = false; inlineEmpty.textContent = t('matches_ui.chart_error'); }
        console.error(error);
    }
}

function buildGoalChartConfig(labels, datasets, metricMeta, goalXValue, scorerValue) {
    return {
        type: 'line',
        data: { labels, datasets },
        options: {
            animation: { duration: 200 },
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            scales: {
                x: {
                    grid: { color: 'rgba(29, 42, 29, 0.08)' },
                    ticks: {
                        callback(_value, chartIndex) { return formatDate(labels[chartIndex]); },
                        maxRotation: 0,
                        autoSkip: true,
                        maxTicksLimit: 5
                    }
                },
                y: {
                    grid: { color: 'rgba(29, 42, 29, 0.08)' },
                    ticks: {
                        callback(value) { return formatMetricValue(Number(value), metricMeta); }
                    }
                }
            },
            plugins: {
                goalMarker: {
                    xValue: goalXValue,
                    yValue: Number.isFinite(scorerValue) ? scorerValue : null,
                    size: 24
                },
                legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } },
                tooltip: {
                    callbacks: {
                        title(context) { return formatDate(context[0]?.label); },
                        label(context) { return `${context.dataset.label}: ${formatMetricValue(context.parsed.y, metricMeta)}`; }
                    }
                }
            }
        },
        plugins: [GOAL_MARKER_PLUGIN]
    };
}

function renderGoalChart(card, match, goal, rows, metricMeta, matchKey) {
    // Desktop side panel
    const panelCanvas = card.querySelector('.match-chart-panel .match-chart-canvas');
    const panelEmpty = card.querySelector('.match-chart-panel .match-chart-empty');
    const metaEl = card.querySelector('.match-chart-meta');

    // Inline chart (mobile / expand under goal)
    const activeButton = card.querySelector('.match-event.is-active');
    const inlineWrap = activeButton?.nextElementSibling?.classList.contains('match-event-chart-inline')
        ? activeButton.nextElementSibling : null;
    const inlineCanvas = inlineWrap?.querySelector('canvas');
    const inlineEmpty = inlineWrap?.querySelector('.match-chart-empty');

    const cityA = match.city_a;
    const cityB = match.city_b;
    const goalTime = goal.updated_at;
    const labels = Array.from(new Set([
        ...getSeriesForCityFromRows(rows, cityA, goal.metric_key).map(point => point.x),
        ...getSeriesForCityFromRows(rows, cityB, goal.metric_key).map(point => point.x),
        goalTime
    ])).sort((left, right) => new Date(left) - new Date(right));

    const cityASeries = new Map(getSeriesForCityFromRows(rows, cityA, goal.metric_key).map(point => [point.x, point.y]));
    const cityBSeries = new Map(getSeriesForCityFromRows(rows, cityB, goal.metric_key).map(point => [point.x, point.y]));
    const goalValuesByCity = goal.values || {};
    const scorerValue = Number(goalValuesByCity[goal.scored_for]);

    if (Number.isFinite(goalValuesByCity[cityA])) {
        cityASeries.set(goalTime, Number(goalValuesByCity[cityA]));
    }
    if (Number.isFinite(goalValuesByCity[cityB])) {
        cityBSeries.set(goalTime, Number(goalValuesByCity[cityB]));
    }

    const goalXValue = labels.indexOf(goalTime);

    const makeDatasets = () => [
        withSmoothLineStyle({
            label: getCityLabel(cityA),
            data: labels.map(label => cityASeries.get(label) ?? null),
            borderColor: MATCH_CHART_COLORS[0],
            backgroundColor: MATCH_CHART_COLORS[0],
            pointRadius: 0, pointHoverRadius: 4,
            borderWidth: 2, spanGaps: true, fill: false
        }),
        withSmoothLineStyle({
            label: getCityLabel(cityB),
            data: labels.map(label => cityBSeries.get(label) ?? null),
            borderColor: MATCH_CHART_COLORS[1],
            backgroundColor: MATCH_CHART_COLORS[1],
            pointRadius: 0, pointHoverRadius: 4,
            borderWidth: 2, spanGaps: true, fill: false
        })
    ];

    const datasets = makeDatasets();
    const hasData = datasets.some(ds => ds.data.some(v => Number.isFinite(v)));

    if (!hasData) {
        const existingChart = state.matchGoalCharts.get(matchKey);
        if (existingChart) { existingChart.destroy(); state.matchGoalCharts.delete(matchKey); }
        const existingInline = state.matchGoalCharts.get(`${matchKey}__inline`);
        if (existingInline) { existingInline.destroy(); state.matchGoalCharts.delete(`${matchKey}__inline`); }

        if (panelCanvas) panelCanvas.hidden = true;
        if (panelEmpty) { panelEmpty.hidden = false; panelEmpty.textContent = t('matches_ui.chart_empty_series'); }
        if (inlineCanvas) inlineCanvas.hidden = true;
        if (inlineEmpty) { inlineEmpty.hidden = false; inlineEmpty.textContent = t('matches_ui.chart_empty_series'); }
        return;
    }

    // Destroy previous charts
    const existingPanel = state.matchGoalCharts.get(matchKey);
    if (existingPanel) existingPanel.destroy();
    const existingInline = state.matchGoalCharts.get(`${matchKey}__inline`);
    if (existingInline) existingInline.destroy();

    const metricLabel = getMetricDisplayLabel(metricMeta);
    if (metaEl) {
        metaEl.textContent = t('matches_ui.goal_meta_turn', {
            scorer: getCityLabel(goal.scored_for),
            minute: formatGoalMinute(goal.updated_at, match.first_snapshot_at, match.latest_snapshot_at),
            metricLower: metricLabel.toLowerCase()
        });
    }

    // Render into desktop side panel
    if (panelCanvas) {
        panelCanvas.hidden = false;
        if (panelEmpty) panelEmpty.hidden = true;
        state.matchGoalCharts.set(matchKey,
            new Chart(panelCanvas, buildGoalChartConfig(labels, datasets, metricMeta, goalXValue, scorerValue)));
    }

    // Render into inline chart (separate Chart instance, shares same data)
    if (inlineCanvas) {
        inlineCanvas.hidden = false;
        if (inlineEmpty) inlineEmpty.hidden = true;
        state.matchGoalCharts.set(`${matchKey}__inline`,
            new Chart(inlineCanvas, buildGoalChartConfig(labels, makeDatasets(), metricMeta, goalXValue, scorerValue)));
    }
}

function renderLatestTable(entries) {
    const metric = getCurrentMetric();
    const body = document.getElementById('latest-table-body');
    const tableWrap = document.querySelector('.table-wrap');
    const emptyEl = document.getElementById('table-empty');

    if (!entries.length) {
        body.innerHTML = '';
        tableWrap.hidden = true;
        emptyEl.hidden = false;
        return;
    }

    tableWrap.hidden = false;
    emptyEl.hidden = true;
    body.innerHTML = entries
        .sort((a, b) => {
            if (metric.better === 'lower') return a.latestValue - b.latestValue;
            return b.latestValue - a.latestValue;
        })
        .map(entry => {
            const deltaText = Number.isFinite(entry.deltaPct) ? `${entry.deltaPct > 0 ? '+' : ''}${entry.deltaPct.toFixed(1)}%` : '-';
            const deltaClass = getDeltaClass(entry.deltaPct, metric);
            return `
                <tr>
                    <td data-label="${escapeHtml(t('latest_table.th_city'))}">${escapeHtml(getCityLabel(entry.city))}</td>
                    <td data-label="${escapeHtml(t('latest_table.th_date'))}">${entry.latestDate ? formatDate(entry.latestDate) : '-'}</td>
                    <td data-label="${escapeHtml(t('latest_table.th_value'))}">${formatMetricValue(entry.latestValue, metric)}</td>
                    <td data-label="${escapeHtml(t('latest_table.th_change'))}" class="${deltaClass}">${deltaText}</td>
                </tr>
            `;
        })
        .join('');
}

function buildTrendChart() {
    const metric = getCurrentMetric();
    const ctx = document.getElementById('trend-chart');
    const emptyEl = document.getElementById('trend-empty');
    const labels = getSelectedDateLabels(metric.key);
    const datasets = state.selectedCities.map((city, index) => {
        const points = new Map(getSeriesForCity(city, metric.key).map(point => [point.x, point.y]));
        return withSmoothLineStyle({
            label: getCityLabel(city),
            data: labels.map(label => points.get(label) ?? null),
            borderColor: COLORS[index % COLORS.length],
            backgroundColor: COLORS[index % COLORS.length],
            pointRadius: 0,
            pointHoverRadius: 5,
            borderWidth: city === state.focusCity ? 4 : 2,
            spanGaps: true,
            fill: false
        });
    });

    const hasData = datasets.some(dataset => dataset.data.some(value => Number.isFinite(value)));

    document.getElementById('trend-title').textContent = t('charts.trend_title_metric', { metric: getMetricDisplayLabel(metric) });

    if (!hasData) {
        if (state.trendChart) {
            state.trendChart.destroy();
            state.trendChart = null;
        }
        ctx.hidden = true;
        emptyEl.hidden = false;
        return false;
    }

    ctx.hidden = false;
    emptyEl.hidden = true;

    if (state.trendChart) state.trendChart.destroy();
    state.trendChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels.map(formatDate),
            datasets
        },
        options: {
            animation: { duration: 300 },
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'nearest', intersect: false },
            scales: {
                x: {
                    grid: { color: 'rgba(29, 42, 29, 0.08)' }
                },
                y: {
                    grid: { color: 'rgba(29, 42, 29, 0.08)' },
                    ticks: {
                        callback(value) {
                            return formatMetricValue(Number(value), metric);
                        }
                    }
                }
            },
            plugins: {
                legend: { position: 'bottom' },
                tooltip: {
                    callbacks: {
                        label(context) {
                            return `${context.dataset.label}: ${formatMetricValue(context.parsed.y, metric)}`;
                        }
                    }
                }
            }
        }
    });

    return true;
}

function buildComparisonChart(entries) {
    const metric = getCurrentMetric();
    const ctx = document.getElementById('comparison-chart');
    const emptyEl = document.getElementById('comparison-empty');
    document.getElementById('comparison-title').textContent = t('charts.comparison_title_metric', { metric: getMetricDisplayLabel(metric) });

    const sorted = [...entries].sort((a, b) => metric.better === 'lower' ? a.latestValue - b.latestValue : b.latestValue - a.latestValue);
    if (!sorted.length) {
        if (state.comparisonChart) {
            state.comparisonChart.destroy();
            state.comparisonChart = null;
        }
        ctx.hidden = true;
        emptyEl.hidden = false;
        return false;
    }

    ctx.hidden = false;
    emptyEl.hidden = true;

    if (state.comparisonChart) state.comparisonChart.destroy();

    state.comparisonChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: sorted.map(entry => getCityLabel(entry.city)),
            datasets: [{
                label: getMetricDisplayLabel(metric),
                data: sorted.map(entry => entry.latestValue),
                backgroundColor: sorted.map(entry => entry.city === state.focusCity ? '#b8572a' : '#2f6f5f'),
                borderRadius: 10
            }]
        },
        options: {
            animation: { duration: 300 },
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: 'y',
            scales: {
                x: {
                    grid: { color: 'rgba(29, 42, 29, 0.08)' },
                    ticks: {
                        callback(value) {
                            return formatMetricValue(Number(value), metric);
                        }
                    }
                },
                y: {
                    grid: { display: false }
                }
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label(context) {
                            return formatMetricValue(context.parsed.x, metric);
                        }
                    }
                }
            }
        }
    });

    return true;
}

function setupChartSectionObserver() {
    const section = document.querySelector('.chart-layout');
    if (!section || state.chartSectionObserver) return;

    state.chartSectionObserver = new IntersectionObserver(entries => {
        state.chartSectionVisible = entries[0].isIntersecting;
        if (state.chartSectionVisible && state.chartsDirty) {
            tryBuildCharts();
        }
    }, { rootMargin: '200px' });
    state.chartSectionObserver.observe(section);
}

function tryBuildCharts() {
    if (typeof Chart === 'undefined') return;
    if (!state.chartSectionVisible) {
        state.chartsDirty = true;
        return;
    }

    const entries = computeLatestComparison(state.metricKey);
    buildTrendChart();
    buildComparisonChart(entries);
    state.chartsDirty = false;
}

function renderAll() {
    updateLoadingState();
    renderStandings();
    renderGoalTicker();
    renderMatches();
    const entries = computeLatestComparison(state.metricKey);
    updateHero(entries);
    updateSummary(entries);
    renderLatestTable(entries);
    state.chartsDirty = true;
    tryBuildCharts();
}

// Lighter re-render for when only the city selection or metric changes.
// Standings and matches don't depend on selected cities or metric, so we skip them.
function renderComparisonPanel() {
    const entries = computeLatestComparison(state.metricKey);
    updateHero(entries);
    updateSummary(entries);
    renderLatestTable(entries);
    state.chartsDirty = true;
    tryBuildCharts();
}

function updateHeroLoadingState() {
    document.querySelectorAll('[data-hero-loading]').forEach(element => {
        element.classList.toggle('loading', state.isBootstrapping);
    });
}

function updateSelectionCaption() {
    const caption = document.getElementById('selection-caption');
    caption.textContent = t('selection.caption', {
        count: state.selectedCities.length,
        focus: getCityLabel(state.focusCity)
    });
}

function setSelectedCities(nextCities) {
    const deduped = [...new Set(nextCities)].filter(city => state.cities.includes(city));
    state.selectedCities = deduped.length ? deduped : [state.cities[0] || DEFAULT_CITY];

    if (!state.selectedCities.includes(state.focusCity)) {
        state.focusCity = state.selectedCities[0] || state.cities[0] || DEFAULT_CITY;
    }

    updateSelectionCaption();
}

function syncFocusCityOptions() {
    const select = document.getElementById('focus-city-select');
    select.innerHTML = state.selectedCities.map(city => `<option value="${escapeHtml(city)}">${escapeHtml(getCityLabel(city))}</option>`).join('');
    if (!state.selectedCities.includes(state.focusCity)) {
        state.focusCity = state.selectedCities[0] || state.cities[0] || DEFAULT_CITY;
    }
    select.value = state.focusCity;

    syncHeroFocusCity();
}

function syncHeroFocusCity() {
    const heroSelect = document.getElementById('hero-focus-city');
    if (state.cities.length) {
        const optCount = heroSelect.options.length;
        if (optCount !== state.cities.length) {
            heroSelect.innerHTML = state.cities.map(city => `<option value="${escapeHtml(city)}">${escapeHtml(getCityLabel(city))}</option>`).join('');
        }
        heroSelect.value = state.focusCity;
    }
}

function renderCityCheckboxes() {
    const container = document.getElementById('city-checkboxes');
    container.innerHTML = state.cities.map(city => `
        <label class="city-pill">
            <input type="checkbox" value="${escapeHtml(city)}" ${state.selectedCities.includes(city) ? 'checked' : ''}>
            <span>${escapeHtml(getCityLabel(city))}</span>
        </label>
    `).join('');

    container.querySelectorAll('input[type="checkbox"]').forEach(input => {
        input.addEventListener('change', () => {
            const next = Array.from(container.querySelectorAll('input:checked')).map(node => node.value);
            setSelectedCities(next);
            syncFocusCityOptions();
            // Defer render so the checkbox visually updates before the charts rebuild
            requestAnimationFrame(() => requestAnimationFrame(() => renderComparisonPanel()));
        });
    });
}

function buildMetricSelectHtml() {
    const baseOptions = METRICS.map(metric => `<option value="${escapeHtml(metric.key)}">${escapeHtml(getMetricDisplayLabel(metric))}</option>`).join('');
    const derivedOptions = DERIVED_METRICS.length
        ? `<optgroup label="${escapeHtml(t('filters.derived_metrics_group', { defaultValue: 'Izvedeni pokazatelji' }))}">${DERIVED_METRICS.map(metric => `<option value="${escapeHtml(metric.key)}">${escapeHtml(getMetricDisplayLabel(metric))}</option>`).join('')}</optgroup>`
        : '';
    return baseOptions + derivedOptions;
}

function renderMetricOptions() {
    const select = document.getElementById('metric-select');
    select.innerHTML = buildMetricSelectHtml();
    select.value = state.metricKey;
    select.addEventListener('change', async event => {
        const nextMetricKey = event.target.value;

        try {
            await loadMetricData(nextMetricKey);
            state.metricKey = nextMetricKey;
            syncMetricPath();
            renderComparisonPanel();
        } catch (error) {
            event.target.value = state.metricKey;
            showError(error);
        }
    });
}

function setFocusCity(city) {
    state.focusCity = city;
    localStorage.setItem('homeCity', city);
    if (!state.selectedCities.includes(city)) {
        state.selectedCities = [...new Set([city, ...state.selectedCities])];
        renderCityCheckboxes();
    }
    syncFocusCityOptions();
    updateSelectionCaption();
    syncFocusCityPath();

    // Toggle focus classes on standings rows without full re-render
    document.querySelectorAll('.standings-row').forEach(row => {
        row.classList.toggle('is-focus', row.dataset.city === city);
    });

    // Toggle focus classes on match cards without full re-render
    const focusSlug = normalizeCitySlug(city);
    document.querySelectorAll('.match-card').forEach(card => {
        const key = card.dataset.matchKey || '';
        const parts = key.split('_');
        card.classList.toggle('is-focus', parts.includes(focusSlug));
    });

    // Sync matches filter to the new home team
    state.matchesFilterCity = city;
    const filterSelect = document.getElementById('matches-city-filter');
    if (filterSelect) filterSelect.value = city;
    renderMatches();

    renderComparisonPanel();
}

function attachFocusCityListener() {
    document.getElementById('focus-city-select').addEventListener('change', event => {
        setFocusCity(event.target.value);
    });

    document.getElementById('hero-focus-city').addEventListener('change', event => {
        setFocusCity(event.target.value);
    });
}

function renderMatchesFilterOptions() {
    const select = document.getElementById('matches-city-filter');
    if (!select) return;

    if (!state.matchesFilterCity && state.focusCity) {
        state.matchesFilterCity = state.focusCity;
    }
    const previousValue = state.cities.includes(state.matchesFilterCity) ? state.matchesFilterCity : '';
    select.innerHTML = [
        `<option value="">${escapeHtml(t('matches.all_cities'))}</option>`,
        ...state.cities.map(city => `<option value="${escapeHtml(city)}">${escapeHtml(getCityLabel(city))}</option>`)
    ].join('');
    select.value = previousValue;
    state.matchesFilterCity = previousValue;
}

function attachMatchesFilterListener() {
    const select = document.getElementById('matches-city-filter');
    if (!select) return;

    select.addEventListener('change', event => {
        state.matchesFilterCity = event.target.value;
        renderMatches();
    });
}

function attachQuickActionListeners() {
    document.getElementById('select-defaults-btn').addEventListener('click', () => {
        setSelectedCities(state.defaultSelectedCities);
        renderCityCheckboxes();
        syncFocusCityOptions();
        renderComparisonPanel();
    });

    document.getElementById('select-all-btn').addEventListener('click', () => {
        setSelectedCities(state.cities);
        renderCityCheckboxes();
        syncFocusCityOptions();
        renderComparisonPanel();
    });
}

function buildComparisonDeepLink() {
    // Always include both city and metric explicitly, even when they are the defaults,
    // so the link works standalone regardless of what the reader's browser state is.
    const citySlug = getCitySlug(state.focusCity);
    const path = buildAppPath(citySlug);
    const metricSlug = metricKeyToSlug(state.metricKey);
    return `${window.location.origin}${path}?metric=${encodeURIComponent(metricSlug)}`;
}

function attachComparisonLinkButton() {
    const btn = document.getElementById('comparison-link-btn');
    if (!btn) return;
    const label = btn.querySelector('.comparison-link-label');
    btn.addEventListener('click', () => {
        const url = buildComparisonDeepLink();
        navigator.clipboard.writeText(url).then(() => {
            btn.classList.add('is-copied');
            if (label) label.textContent = t('filters.copy_link_copied', { defaultValue: 'Kopirano' });
            setTimeout(() => {
                btn.classList.remove('is-copied');
                if (label) label.textContent = t('filters.copy_link_label');
            }, 1500);
        }).catch(() => {});
    });
}

async function fetchJson(pathname, { retries = 2 } = {}) {
    const apiBase = getApiBase();
    const url = `${apiBase}${pathname}`;

    for (let attempt = 0; ; attempt++) {
        let response;
        try {
            response = await fetch(url, { headers: { Accept: 'application/json' } });
        } catch (networkError) {
            if (attempt < retries) {
                await new Promise(resolve => setTimeout(resolve, 300 * 2 ** attempt));
                continue;
            }
            throw new Error(t('errors.api_unavailable', { base: apiBase, path: pathname }));
        }

        if (!response.ok) {
            if (response.status === 404) {
                throw new Error(t('errors.route_not_found', { path: pathname, base: apiBase }));
            }
            throw new Error(t('errors.http_status', { status: response.status, path: pathname }));
        }

        try {
            return await response.json();
        } catch (_jsonError) {
            if (attempt < retries) {
                await new Promise(resolve => setTimeout(resolve, 300 * 2 ** attempt));
                continue;
            }
            throw new Error(t('errors.bad_json', { path: pathname }));
        }
    }
}

function updateLoadingState() {
    const isLoading = Boolean(state.loadingMetricKey) || state.loadingStandings || state.loadingMatches;
    document.getElementById('metric-select').disabled = isLoading;
    document.getElementById('select-defaults-btn').disabled = isLoading;
    document.getElementById('select-all-btn').disabled = isLoading;
    document.getElementById('matches-city-filter').disabled = isLoading;
    updateHeroLoadingState();
}

async function loadMatchesAndStandings() {
    state.loadingMatches = true;
    state.loadingStandings = true;
    updateLoadingState();

    try {
        const payload = await fetchJson('/city-stats/matches');
        state.matches = Array.isArray(payload?.matches) ? payload.matches : [];
        state.standingsRows = Array.isArray(payload?.standings) ? payload.standings : [];
        state.standingsMeta = payload || null;
    } finally {
        state.loadingMatches = false;
        state.loadingStandings = false;
        updateLoadingState();
    }
}

async function loadCityList() {
    const cityMeta = await fetchJson('/city-stats/cities');
    const defaultCities = cityMeta
        .map(entry => entry.city)
        .filter(city => DEFAULT_CITY_SET.includes(city));
    const labelToCity = new Map();
    for (const city of [...new Set(cityMeta.map(entry => entry.city))]) {
        const label = getCityLabel(city);
        const existing = labelToCity.get(label);
        // Prefer the variant that starts with uppercase
        if (!existing || (city[0] === city[0].toUpperCase() && city[0] !== city[0].toLowerCase())) {
            labelToCity.set(label, city);
        }
    }
    state.cities = [...labelToCity.values()];
    const { cityBySlug, citySlugs } = buildCitySlugMaps(state.cities);
    state.cityBySlug = cityBySlug;
    state.citySlugs = citySlugs;
    state.defaultSelectedCities = defaultCities.length ? defaultCities : state.cities.slice(0, 6);
    state.selectedCities = [...state.defaultSelectedCities];
    const savedHome = localStorage.getItem('homeCity');
    const requestedHomeCity = REQUESTED_HOME_CITY_SLUG ? state.cityBySlug.get(REQUESTED_HOME_CITY_SLUG) : '';
    if (requestedHomeCity) {
        state.focusCity = requestedHomeCity;
    } else if (savedHome && state.cities.includes(savedHome)) {
        state.focusCity = savedHome;
    } else {
        state.focusCity = state.selectedCities.includes(DEFAULT_CITY) ? DEFAULT_CITY : (state.selectedCities[0] || state.cities[0] || DEFAULT_CITY);
    }
    if (!state.selectedCities.includes(state.focusCity)) {
        state.selectedCities = [...new Set([state.focusCity, ...state.selectedCities])];
    }
}

async function loadMetricData(metricKey) {
    if (state.rowsByMetric.has(metricKey)) {
        state.loadingMetricKey = null;
        updateLoadingState();
        return;
    }

    const metric = METRIC_BY_KEY.get(metricKey) || METRICS[0];
    state.loadingMetricKey = metricKey;
    updateLoadingState();

    const rows = await fetchJson(`/city-stats/data?metric=${encodeURIComponent(metricKey)}`);
    state.rowsByMetric.set(metricKey, normalizeRows(rows, metricKey));

    state.loadingMetricKey = null;
    updateLoadingState();
}

function showError(error) {
    console.error(error);
    state.isBootstrapping = false;
    state.loadingMetricKey = null;
    updateLoadingState();
}

function syncMetricSelectLabels() {
    const select = document.getElementById('metric-select');
    if (!select) return;
    // Rebuild to update optgroup label and all option labels after language change
    select.innerHTML = buildMetricSelectHtml();
    select.value = state.metricKey;
}

function syncLocaleSelect() {
    const sel = document.getElementById('locale-select');
    if (!sel || !Array.isArray(globalThis.USPOREDBE_SUPPORTED_LANGS)) return;
    const langs = globalThis.USPOREDBE_SUPPORTED_LANGS;
    const resolved = (typeof i18next !== 'undefined' && i18next.resolvedLanguage)
        ? String(i18next.resolvedLanguage).split('-')[0]
        : 'hr';
    sel.innerHTML = langs.map(lng => `<option value="${escapeHtml(lng)}">${escapeHtml(t(`lang.${lng}`))}</option>`).join('');
    if (langs.includes(resolved)) sel.value = resolved;
}

function attachLocaleSelectListener() {
    const sel = document.getElementById('locale-select');
    if (!sel) return;
    sel.addEventListener('change', () => {
        void globalThis.changeUsporedbeLanguage(sel.value);
    });
}

let appUiReady = false;

globalThis.onUsporedbeLanguageChanged = () => {
    syncLocaleSelect();
    syncMetricSelectLabels();
    if (appUiReady) {
        renderAll();
    }
};

function applyMetricFromUrl() {
    const slug = getMetricSlugFromUrl();
    if (!slug) return false;
    const key = metricSlugToKey(slug);
    if (METRIC_BY_KEY.has(key)) {
        state.metricKey = key;
        return true;
    }
    return false;
}

async function init() {
    const deepLinkedMetric = applyMetricFromUrl();
    renderMetricOptions();
    attachFocusCityListener();
    attachMatchesFilterListener();
    attachQuickActionListeners();
    attachComparisonLinkButton();
    setupChartSectionObserver();
    updateHeroLoadingState();
    try {
        const metricPromise = loadMetricData(state.metricKey);
        await loadCityList();
        syncHeroFocusCity();
        renderMatchesFilterOptions();
        await Promise.all([loadMatchesAndStandings(), metricPromise]);
        state.isBootstrapping = false;
        updateSelectionCaption();
        renderCityCheckboxes();
        syncFocusCityOptions();
        if (REQUESTED_HOME_CITY_SLUG) {
            syncFocusCityPath();
        }
        renderAll();
        if (deepLinkedMetric) {
            document.getElementById('comparison-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else {
            scrollToMatchFromHash();
        }
    } catch (error) {
        showError(error);
        renderAll();
    }
}

async function applyCityLanguageHint() {
    if (!REQUESTED_HOME_CITY_SLUG) return;
    if (localStorage.getItem('usporedbeLang')) return;

    const cityId = CITY_SLUG_ALIASES.find(([alias]) =>
        normalizeCitySlug(alias) === REQUESTED_HOME_CITY_SLUG
    )?.[1];
    if (!cityId) return;

    const lang = CITY_LANG[cityId];
    if (lang && USPOREDBE_SUPPORTED_LANGS.includes(lang)) {
        await changeUsporedbeLanguage(lang);
    }
}

async function bootstrap() {
    await initUsporedbeI18n();
    await applyCityLanguageHint();
    syncLocaleSelect();
    attachLocaleSelectListener();
    await init();
    appUiReady = true;
}

bootstrap();
