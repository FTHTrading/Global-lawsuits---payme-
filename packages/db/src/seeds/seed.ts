import "dotenv/config";
import { db, userProfiles, entities } from "../index.js";

async function seed() {
  console.log("🌱 Seeding database...");

  // Demo user profile
  await db.insert(userProfiles).values({
    displayName: "Demo User",
    emailAddresses: ["user@example.com", "john.doe@gmail.com"],
    phoneNumbers: ["+15551234567"],
    mailingAddresses: [
      {
        street: "123 Main St",
        city: "San Francisco",
        state: "CA",
        zip: "94105",
        country: "US",
      },
    ],
    merchants: [
      "Amazon",
      "Google",
      "Meta",
      "Apple",
      "T-Mobile",
      "AT&T",
      "Verizon",
      "Wells Fargo",
      "Bank of America",
      "Chase",
      "Capital One",
      "Equifax",
      "TransUnion",
      "Experian",
    ],
    products: [
      "iPhone",
      "MacBook",
      "Pixel",
      "Ring Doorbell",
      "Alexa",
      "Instagram",
      "WhatsApp",
      "TikTok",
    ],
    brokerages: ["Robinhood", "Fidelity", "Charles Schwab", "E*TRADE"],
    employers: [
      { name: "Tech Corp", start_date: "2020-01-01", end_date: "2024-06-30" },
    ],
    mode: "personal",
  });

  // Seed known entities for matching
  const entityData = [
    { name: "Meta Platforms", aliases: ["Facebook", "Instagram", "WhatsApp", "Meta"], type: "company", industry: "technology" },
    { name: "Google LLC", aliases: ["Google", "Alphabet", "YouTube", "Android"], type: "company", industry: "technology" },
    { name: "Amazon.com Inc", aliases: ["Amazon", "AWS", "Alexa", "Ring", "Whole Foods"], type: "company", industry: "technology" },
    { name: "Apple Inc", aliases: ["Apple", "iPhone", "MacBook", "iPad", "Apple Music"], type: "company", industry: "technology" },
    { name: "T-Mobile US", aliases: ["T-Mobile", "Sprint", "Metro by T-Mobile"], type: "company", industry: "telecom" },
    { name: "AT&T Inc", aliases: ["AT&T", "DirecTV"], type: "company", industry: "telecom" },
    { name: "Wells Fargo", aliases: ["Wells Fargo", "WFC"], type: "company", industry: "finance" },
    { name: "Equifax Inc", aliases: ["Equifax"], type: "company", industry: "finance" },
    { name: "Capital One", aliases: ["Capital One Financial"], type: "company", industry: "finance" },
    { name: "Robinhood Markets", aliases: ["Robinhood"], type: "company", industry: "finance" },
  ];

  for (const entity of entityData) {
    await db.insert(entities).values(entity);
  }

  console.log("✅ Seed complete.");
  process.exit(0);
}

seed().catch((e) => {
  console.error("❌ Seed failed:", e);
  process.exit(1);
});
