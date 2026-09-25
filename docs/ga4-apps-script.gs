/**
 * DS Metrics — GA4 Apps Script bridge
 *
 * Runs under YOUR Google account, so it reads GA4 with your own permissions.
 * No Google Cloud project or service account needed.
 *
 * What it sends for every property:
 *   - periods: accurate totals for each reporting period AND its previous period
 *              (last 30 days, last 60 days, this/last quarter, this/last year)
 *   - daily:   a day-by-day series (last 400 days) used for the trend charts
 *   - topPages: most viewed pages
 *
 * Setup
 * ────────────────────────────────────────────────────────────────────────────
 * 1. Paste this whole file into Code.gs.
 * 2. Project Settings → tick "Show appsscript.json manifest file" and use:
 *    {
 *      "timeZone": "Europe/Vilnius",
 *      "exceptionLogging": "STACKDRIVER",
 *      "runtimeVersion": "V8",
 *      "oauthScopes": [
 *        "https://www.googleapis.com/auth/analytics.readonly",
 *        "https://www.googleapis.com/auth/script.external_request",
 *        "https://www.googleapis.com/auth/script.scriptapp"
 *      ]
 *    }
 * 3. Project Settings → Script properties → add:
 *      SHARED_SECRET    same long random value saved in the backend
 *      GA4_INGEST_URL   backend function endpoint for ga4-analytics
 *      GA4_PROPERTIES   JSON array, e.g. [{"id":"123","label":"Zeroheight"}]
 * 4. Run pushGa4Reports once from the Apps Script editor and authorize it.
 * 5. Run installDailyGa4PushTrigger to refresh every morning.
 */

var DAILY_WINDOW_DAYS = 400;

var PERIOD_KEYS = ['last_30', 'last_60', 'this_quarter', 'last_quarter', 'this_year', 'last_year'];

function doPost(e) {
  try {
    var body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    var expected = getRequiredProperty_('SHARED_SECRET');

    if (!safeEquals_(String(body.secret || ''), expected)) {
      return json_({ ok: false, error: 'unauthorized' }, 401);
    }

    var properties = Array.isArray(body.properties) ? body.properties : readProperties_();
    if (!properties.length) return json_({ ok: false, error: 'no properties provided' }, 400);

    return json_(buildReport_(properties, clamp_(parseInt(body.pageLimit, 10) || 50, 1, 250)), 200);
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message ? err.message : err) }, 500);
  }
}

function doGet() {
  return json_({ ok: true, service: 'ds-metrics-ga4-bridge' }, 200);
}

/** Pushes the configured GA4 reports to the ga4-analytics edge function. */
function pushGa4Reports() {
  var properties = readProperties_();
  if (!properties.length) throw new Error('GA4_PROPERTIES script property is empty or invalid');

  var report = buildReport_(properties, 50);
  var result = postSnapshot_(report);
  Logger.log(JSON.stringify({ ok: true, pushed: result }, null, 2));
  return result;
}

/** Installs a daily refresh trigger around 06:00 in the script timezone. */
function installDailyGa4PushTrigger() {
  removeGa4PushTriggers();
  ScriptApp.newTrigger('pushGa4Reports').timeBased().everyDays(1).atHour(6).create();
  Logger.log('Installed daily GA4 push trigger.');
}

function removeGa4PushTriggers() {
  ScriptApp.getProjectTriggers().forEach(function (trigger) {
    if (trigger.getHandlerFunction() === 'pushGa4Reports') {
      ScriptApp.deleteTrigger(trigger);
    }
  });
}

/** Quick check from the editor: validates properties and runs one small report. */
function testGa4Configuration() {
  var properties = readProperties_();
  if (!properties.length) throw new Error('GA4_PROPERTIES script property is empty or invalid');
  var id = String(properties[0].id || '').replace(/[^0-9]/g, '');
  if (!id) throw new Error('First GA4 property ID is invalid');
  var totals = runTotals_(id, toISODate_(daysAgo_(7)), toISODate_(new Date()));
  Logger.log(JSON.stringify({ ok: true, property: properties[0].label || id, totals: totals }, null, 2));
}

function buildReport_(properties, pageLimit) {
  var windows = buildPeriodWindows_();
  var dailyStart = toISODate_(daysAgo_(DAILY_WINDOW_DAYS));
  var dailyEnd = toISODate_(new Date());

  var results = properties.map(function (p) {
    var id = String(p && p.id ? p.id : '').replace(/[^0-9]/g, '');
    var label = String((p && p.label) || id);
    if (!id) return { id: '', label: label, error: 'invalid property id' };
    try {
      var periods = {};
      PERIOD_KEYS.forEach(function (key) {
        var window = windows[key];
        // One report with three date ranges: current, previous, same period last year.
        var totals = runMultiTotals_(id, [window.current, window.previous, window.yearAgo]);
        periods[key] = {
          range: window.current,
          previousRange: window.previous,
          yearAgoRange: window.yearAgo,
          totals: totals[0],
          previousTotals: totals[1],
          yearAgoTotals: totals[2],
          pages: runPagesCompare_(id, window.current, window.previous, pageLimit)
        };
      });

      return {
        id: id,
        label: label,
        totals: periods.last_30.totals,
        periods: periods,
        daily: runDaily_(id, dailyStart, dailyEnd),
        topPages: periods.last_30.pages
      };
    } catch (err) {
      return { id: id, label: label, error: String(err && err.message ? err.message : err) };
    }
  });

  return {
    ok: true,
    configured: true,
    source: 'apps_script',
    range: { startDate: dailyStart, endDate: dailyEnd, label: 'Rolling ' + DAILY_WINDOW_DAYS + ' days' },
    properties: results
  };
}

/** Current, previous and year-ago window for every reporting period the app offers. */
function buildPeriodWindows_() {
  var today = new Date();
  var year = today.getUTCFullYear();
  var quarter = Math.floor(today.getUTCMonth() / 3);
  var windows = {};

  [30, 60].forEach(function (days) {
    var end = today;
    var start = addDays_(end, -days + 1);
    windows['last_' + days] = {
      current: { startDate: toISODate_(start), endDate: toISODate_(end) },
      previous: { startDate: toISODate_(addDays_(start, -days)), endDate: toISODate_(addDays_(start, -1)) },
      yearAgo: { startDate: toISODate_(addDays_(start, -365)), endDate: toISODate_(addDays_(end, -365)) }
    };
  });

  [['this_quarter', 0], ['last_quarter', -1]].forEach(function (entry) {
    var index = quarter + entry[1];
    windows[entry[0]] = {
      current: quarterRange_(year, index),
      previous: quarterRange_(year, index - 1),
      yearAgo: quarterRange_(year - 1, index)
    };
  });

  [['this_year', 0], ['last_year', -1]].forEach(function (entry) {
    var y = year + entry[1];
    windows[entry[0]] = {
      current: { startDate: toISODate_(utc_(y, 0, 1)), endDate: toISODate_(utc_(y, 11, 31)) },
      previous: { startDate: toISODate_(utc_(y - 1, 0, 1)), endDate: toISODate_(utc_(y - 1, 11, 31)) },
      yearAgo: { startDate: toISODate_(utc_(y - 1, 0, 1)), endDate: toISODate_(utc_(y - 1, 11, 31)) }
    };
  });

  return windows;
}

function quarterRange_(year, index) {
  var q = ((index % 4) + 4) % 4;
  var y = year + Math.floor(index / 4);
  return {
    startDate: toISODate_(utc_(y, q * 3, 1)),
    endDate: toISODate_(new Date(Date.UTC(y, q * 3 + 3, 0)))
  };
}


/** Overall metrics for one property. */
function runTotals_(propertyId, startDate, endDate) {
  var res = runReport_(propertyId, {
    dateRanges: [{ startDate: startDate, endDate: endDate }],
    metrics: [
      { name: 'activeUsers' },
      { name: 'totalUsers' },
      { name: 'newUsers' },
      { name: 'sessions' },
      { name: 'engagedSessions' },
      { name: 'screenPageViews' },
      { name: 'userEngagementDuration' },
      { name: 'engagementRate' },
      { name: 'averageSessionDuration' }
    ]
  });
  var row = (res.rows && res.rows[0]) || { metricValues: [] };
  var v = function (i) { return Number((row.metricValues[i] || {}).value || 0); };
  var sessions = v(3);
  var activeUsers = v(0);
  return {
    activeUsers: activeUsers,
    totalUsers: v(1),
    newUsers: v(2),
    sessions: sessions,
    engagedSessions: v(4),
    pageViews: v(5),
    engagementDurationSeconds: v(6),
    engagementRate: v(7),
    avgSessionDurationSeconds: v(8),
    sessionsPerUser: activeUsers ? sessions / activeUsers : 0,
    avgEngagementPerSession: sessions ? v(6) / sessions : 0
  };
}

/** Day-by-day series used for the trend charts. */
function runDaily_(propertyId, startDate, endDate) {
  var res = runReport_(propertyId, {
    dateRanges: [{ startDate: startDate, endDate: endDate }],
    dimensions: [{ name: 'date' }],
    metrics: [
      { name: 'activeUsers' },
      { name: 'totalUsers' },
      { name: 'sessions' },
      { name: 'engagedSessions' },
      { name: 'screenPageViews' },
      { name: 'userEngagementDuration' }
    ],
    orderBys: [{ dimension: { dimensionName: 'date' } }],
    limit: 500
  });
  return (res.rows || []).map(function (r) {
    var raw = (r.dimensionValues[0] || {}).value || '';
    var v = function (i) { return Number((r.metricValues[i] || {}).value || 0); };
    return {
      date: raw.length === 8 ? raw.slice(0, 4) + '-' + raw.slice(4, 6) + '-' + raw.slice(6, 8) : raw,
      activeUsers: v(0),
      totalUsers: v(1),
      sessions: v(2),
      engagedSessions: v(3),
      pageViews: v(4),
      engagementDurationSeconds: v(5)
    };
  });
}

/**
 * Totals for several date ranges in a single report.
 * Returns an array of totals objects aligned with the given ranges.
 */
function runMultiTotals_(propertyId, ranges) {
  var res = runReport_(propertyId, {
    dateRanges: ranges.map(function (r, i) {
      return { startDate: r.startDate, endDate: r.endDate, name: 'r' + i };
    }),
    metrics: [
      { name: 'activeUsers' },
      { name: 'totalUsers' },
      { name: 'newUsers' },
      { name: 'sessions' },
      { name: 'engagedSessions' },
      { name: 'screenPageViews' },
      { name: 'userEngagementDuration' },
      { name: 'engagementRate' },
      { name: 'averageSessionDuration' }
    ]
  });

  var out = ranges.map(function () { return emptyTotals_(); });
  (res.rows || []).forEach(function (row) {
    var name = String(((row.dimensionValues || [])[0] || {}).value || 'r0');
    var index = parseInt(name.replace(/[^0-9]/g, ''), 10);
    if (isNaN(index) || index < 0 || index >= out.length) index = 0;
    out[index] = totalsFromRow_(row);
  });
  return out;
}

function emptyTotals_() {
  return {
    activeUsers: 0, totalUsers: 0, newUsers: 0, sessions: 0, engagedSessions: 0,
    pageViews: 0, engagementDurationSeconds: 0, engagementRate: 0,
    avgSessionDurationSeconds: 0, sessionsPerUser: 0, avgEngagementPerSession: 0
  };
}

function totalsFromRow_(row) {
  var values = row.metricValues || [];
  var v = function (i) { return Number((values[i] || {}).value || 0); };
  var sessions = v(3);
  var activeUsers = v(0);
  return {
    activeUsers: activeUsers,
    totalUsers: v(1),
    newUsers: v(2),
    sessions: sessions,
    engagedSessions: v(4),
    pageViews: v(5),
    engagementDurationSeconds: v(6),
    engagementRate: v(7),
    avgSessionDurationSeconds: v(8),
    sessionsPerUser: activeUsers ? sessions / activeUsers : 0,
    avgEngagementPerSession: sessions ? v(6) / sessions : 0
  };
}

/** Page paths with current and previous period views, used for the movers list. */
function runPagesCompare_(propertyId, currentRange, previousRange, limit) {
  var res = runReport_(propertyId, {
    dateRanges: [
      { startDate: currentRange.startDate, endDate: currentRange.endDate, name: 'r0' },
      { startDate: previousRange.startDate, endDate: previousRange.endDate, name: 'r1' }
    ],
    dimensions: [{ name: 'pagePath' }, { name: 'pageTitle' }],
    metrics: [{ name: 'screenPageViews' }, { name: 'activeUsers' }],
    orderBys: [{ desc: true, metric: { metricName: 'screenPageViews' } }],
    limit: clamp_(limit * 4, 10, 1000)
  });

  var byPath = {};
  var order = [];
  (res.rows || []).forEach(function (r) {
    var dims = r.dimensionValues || [];
    var path = (dims[0] || {}).value || '';
    var title = (dims[1] || {}).value || '';
    var rangeName = String((dims[2] || {}).value || 'r0');
    var views = Number(((r.metricValues || [])[0] || {}).value || 0);
    var users = Number(((r.metricValues || [])[1] || {}).value || 0);

    if (!byPath[path]) {
      byPath[path] = {
        path: path, title: title, pageViews: 0, activeUsers: 0,
        previousPageViews: 0, previousActiveUsers: 0
      };
      order.push(path);
    }
    var entry = byPath[path];
    if (!entry.title && title) entry.title = title;
    if (rangeName === 'r1') {
      entry.previousPageViews += views;
      entry.previousActiveUsers += users;
    } else {
      entry.pageViews += views;
      entry.activeUsers += users;
    }
  });

  return order
    .map(function (path) { return byPath[path]; })
    .sort(function (a, b) { return b.pageViews - a.pageViews; })
    .slice(0, limit);
}


/** Analytics Data API runReport via the script owner's OAuth token. */
function runReport_(propertyId, payload) {
  var url = 'https://analyticsdata.googleapis.com/v1beta/properties/' + propertyId + ':runReport';
  var res = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });
  var code = res.getResponseCode();
  var text = res.getContentText();
  if (code < 200 || code >= 300) throw new Error('GA4 ' + code + ': ' + text);
  return JSON.parse(text || '{}');
}

function postSnapshot_(report) {
  var url = getRequiredProperty_('GA4_INGEST_URL');
  var secret = getRequiredProperty_('SHARED_SECRET');
  var payload = Object.assign({}, report, {
    ingest: true,
    secret: secret,
    source: 'apps_script_push'
  });

  var res = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });
  var code = res.getResponseCode();
  var text = res.getContentText();
  if (code < 200 || code >= 300) throw new Error('Ingest ' + code + ': ' + text);
  var body = JSON.parse(text || '{}');
  if (body.ok !== true) throw new Error('Ingest failed: ' + text);
  return body;
}

function readProperties_() {
  var raw = PropertiesService.getScriptProperties().getProperty('GA4_PROPERTIES') || '[]';
  var parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) throw new Error('GA4_PROPERTIES must be a JSON array');
  return parsed.map(function (p) {
    return { id: String((p && p.id) || '').replace(/[^0-9]/g, ''), label: String((p && p.label) || '') };
  }).filter(function (p) { return p.id; });
}

function getRequiredProperty_(name) {
  var value = PropertiesService.getScriptProperties().getProperty(name);
  if (!value) throw new Error(name + ' script property is not set');
  return value;
}

function toISODate_(date) {
  return Utilities.formatDate(date, 'UTC', 'yyyy-MM-dd');
}

function utc_(year, month, day) {
  return new Date(Date.UTC(year, month, day));
}

function addDays_(date, days) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function daysAgo_(days) {
  return addDays_(new Date(), -days);
}

function clamp_(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function safeEquals_(a, b) {
  if (a.length !== b.length) return false;
  var diff = 0;
  for (var i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function json_(obj, status) {
  // Apps Script web apps always return 200; the status is echoed in the body.
  return ContentService.createTextOutput(JSON.stringify(
    Object.assign({ status: status || 200 }, obj)
  )).setMimeType(ContentService.MimeType.JSON);
}
