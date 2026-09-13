// auto-update-mongo-whitelist.js
// Node.js 18+ (uses built-in fetch)
//
// Automatically detects your current public IP and updates your
// MongoDB Atlas Project IP Access List so your MERN app can always connect.
//
// Setup:
// 1. Create an Atlas API Key with project access
//    1.1. Go to your Project → Project Identity & Access → Applications → API Keys tab
//    1.2. Click Create API Key directly here (creating it at the org level requires an extra step to attach it to a project — simpler to create it at the project level)
//    1.3. Assign role: Project IP Access List Admin (or Project Owner)
//    1.4. Copy the Public Key and Private Key immediately — the private key is shown only once
// 2. Note your Project ID (Project Settings > General).
// 3. Install dependency: npm install digest-fetch
// 4. Set environment variables (e.g. in a .env file):
//    ATLAS_PUBLIC_KEY=xxxx
//    ATLAS_PRIVATE_KEY=xxxx
//    ATLAS_PROJECT_ID=xxxx
//    ATLAS_ENTRY_COMMENT=my-dev-machine
//
// Run manually: node auto-update-mongo-whitelist.js
// Or add to package.json: "prestart": "node auto-update-mongo-whitelist.js"

const { default: DigestFetch } = require("digest-fetch");
require("dotenv").config({ path: "config.env" });

const {
  ATLAS_PUBLIC_KEY,
  ATLAS_PRIVATE_KEY,
  ATLAS_PROJECT_ID,
  /**
   * it's a default fallback. It's only used if ATLAS_ENTRY_COMMENT is missing/undefined
   * in config.env; if it's set there, the env value wins.
   */
  ATLAS_ENTRY_COMMENT = "auto-updated-dev-ip",
} = process.env;

const BASE_URL = `https://cloud.mongodb.com/api/atlas/v2/groups/${ATLAS_PROJECT_ID}/accessList`;
const client = new DigestFetch(ATLAS_PUBLIC_KEY, ATLAS_PRIVATE_KEY);

async function getCurrentPublicIp() {
  const res = await fetch("https://api.ipify.org?format=json");
  const data = await res.json();
  return data.ip;
}

async function getExistingEntryForComment() {
  const res = await client.fetch(BASE_URL, {
    headers: { Accept: "application/vnd.atlas.2023-11-15+json" },
  });
  const data = await res.json();
  const results = data.results || [];
  return results.find((entry) => entry.comment === ATLAS_ENTRY_COMMENT);
}

async function deleteEntry(ipAddress) {
  const url = `${BASE_URL}/${ipAddress}`;
  await client.fetch(url, { method: "DELETE" });
  console.log(`Removed old whitelist entry: ${ipAddress}`);
}

async function addEntry(ipAddress) {
  const body = [
    {
      ipAddress,
      comment: ATLAS_ENTRY_COMMENT,
    },
  ];
  /**
   * It's a versioned media type for MongoDB Atlas's Admin API — the date (2023-11-15) pins which
   * API version's request/response schema you want, since Atlas API is versioned by date, not URL path.
   * Mandatory: yes, for this API — without an Accept/Content-Type header specifying a version, Atlas
   * can't determine schema shape and requests fail.
   * Fixed?: no, it's not universally fixed — it's whatever version you choose to target.
   * 2023-11-15 is just a valid, stable version Atlas still supports. You could pin a different
   * available version if needed, but you must pin some date.
   */
  const res = await client.fetch(BASE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/vnd.atlas.2023-11-15+json",
      Accept: "application/vnd.atlas.2023-11-15+json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to add IP: ${res.status} ${errText}`);
  }
  console.log(`Added new whitelist entry: ${ipAddress}`);
}

async function main() {
  if (!ATLAS_PUBLIC_KEY || !ATLAS_PRIVATE_KEY || !ATLAS_PROJECT_ID) {
    console.error(
      "Missing ATLAS_PUBLIC_KEY, ATLAS_PRIVATE_KEY, or ATLAS_PROJECT_ID in .env",
    );
    process.exit(1);
  }

  const currentIp = await getCurrentPublicIp();
  console.log(`Current public IP: ${currentIp}`);

  const existingEntry = await getExistingEntryForComment();

  if (existingEntry && existingEntry.ipAddress === currentIp) {
    console.log("IP unchanged, nothing to update.");
    return;
  }

  if (existingEntry) {
    await deleteEntry(existingEntry.ipAddress);
  }

  await addEntry(currentIp);
  console.log("Whitelist updated successfully.");
}

main().catch((err) => {
  console.error("Error updating whitelist:", err);
  process.exit(1);
});
