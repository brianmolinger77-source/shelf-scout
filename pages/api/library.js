// pages/api/library.js
// Serverless proxy — fetches charlotte.delco.lib.pa.us and parses Radnor availability

export default async function handler(req, res) {
  const { title, author } = req.query;

  if (!title || !author) {
    return res.status(400).json({ error: 'Missing title or author' });
  }

  // Search by title only first for better matches, then filter by author in results
  const query = encodeURIComponent(`${title} ${author}`);
  const url = `https://charlotte.delco.lib.pa.us/search/X?searchtype=X&searcharg=${query}&searchscope=35&SORT=D`;

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ShelfScout/1.0)',
        'Accept': 'text/html',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      return res.status(200).json({ status: 'unknown', url });
    }

    const html = await response.text();

    // Check for no results
    const noResults =
      html.includes('No matches found') ||
      html.includes('Your search retrieved no results');

    if (noResults) {
      return res.status(200).json({ status: 'not_in_catalog', url });
    }

    // If multiple results returned, we get a list page not a detail page
    // Look for the detail page pattern (single record with holdings table)
    const isDetailPage = html.includes('CALL #') || html.includes('Call #') || html.includes('callnum');
    
    if (!isDetailPage) {
      // We got a results list — follow the first result link to the detail page
      // Look for the first bib record link
      const firstRecordMatch = html.match(/href="([^"]*\/record=[^"&]*)[^"]*"/i);
      if (firstRecordMatch) {
        const detailUrl = `https://charlotte.delco.lib.pa.us${firstRecordMatch[1]}`;
        const detailResp = await fetch(detailUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ShelfScout/1.0)', 'Accept': 'text/html' },
          signal: AbortSignal.timeout(8000),
        });
        if (detailResp.ok) {
          const detailHtml = await detailResp.text();
          return parseHoldings(detailHtml, url, res);
        }
      }
    }

    return parseHoldings(html, url, res);

  } catch (err) {
    console.error('Library fetch error:', err.message);
    return res.status(200).json({ status: 'unknown', url, error: err.message });
  }
}

function parseHoldings(html, url, res) {
  // Match Radnor rows — the holdings table has rows with LOCATION | CALL# | STATUS
  // We look for RADNOR within 600 chars followed by a status keyword
  const radnorPattern = /RADNOR[\s\S]{0,600}?(CHECK\s+SHELF|CHECKED\s+OUT|DUE\s+\d{2}-\d{2}-\d{2,4}|IN\s+TRANSIT|ON\s+ORDER|MISSING|BILLED)/gi;
  const matches = [...html.matchAll(radnorPattern)];

  if (matches.length === 0) {
    return res.status(200).json({ status: 'not_at_radnor', url });
  }

  const radnorBlock = matches[0][0];

  // Extract call number — Dewey decimal format like "364.1 SHA" or "955.054 BOW"
  // Must start with 3 digits to avoid matching page numbers
  let callNumber = null;
  const callMatch = radnorBlock.match(/\b(\d{3}\.[\d]+\s+[A-Z]{2,5})\b/);
  if (callMatch) callNumber = callMatch[1].trim();

  // Extract section
  let section = null;
  const sectionMatch = radnorBlock.match(/\b(NONFICTION|FICTION|MYSTERY|BIOGRAPHY|LARGE\s+PRINT|REFERENCE|YOUNG\s+ADULT|CHILDREN'?S?)\b/i);
  if (sectionMatch) {
    section = sectionMatch[1].replace(/\s+/g, ' ').trim();
    section = section.charAt(0).toUpperCase() + section.slice(1).toLowerCase();
  }

  // Build location string
  let location = null;
  if (section && callNumber) location = `${section} · ${callNumber}`;
  else if (callNumber) location = callNumber;
  else if (section) location = section;

  // Determine status
  const statusText = matches[0][1].toUpperCase().trim();
  let status = 'unknown';
  let dueDate = null;

  if (/CHECK\s+SHELF/.test(statusText)) {
    status = 'available';
  } else if (/CHECKED\s+OUT/.test(statusText)) {
    status = 'checked_out';
  } else if (/DUE\s+(\d{2}-\d{2}-\d{2,4})/.test(statusText)) {
    status = 'checked_out';
    const dateMatch = statusText.match(/DUE\s+(\d{2}-\d{2}-\d{2,4})/);
    if (dateMatch) dueDate = dateMatch[1];
  } else if (/IN\s+TRANSIT/.test(statusText)) {
    status = 'in_transit';
  } else if (/ON\s+ORDER/.test(statusText)) {
    status = 'on_order';
  } else if (/MISSING/.test(statusText)) {
    status = 'missing';
  }

  return res.status(200).json({ status, location, callNumber, section, dueDate, url });
}
