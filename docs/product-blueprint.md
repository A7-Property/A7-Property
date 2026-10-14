# Myanmar Home Discovery — Product Blueprint

## 1. Product vision

Build the most trusted and human way to find a home in Myanmar. The product is not a classified-listing directory; it is a guided discovery experience that helps people move from “I might need a home” to “I feel confident viewing this one.”

### Product promise

**Real homes, clear information, direct conversations.**

### Strategic principles

1. **Trust before inventory.** Verification, freshness, owner identity, transparent fees, and report controls are visible before users make contact.
2. **A home search, not a form.** Start with familiar locations and intent, then progressively reveal filters in everyday language.
3. **Myanmar-first communication.** English and Myanmar typography, phone-first contact, low-bandwidth images, familiar MMK price expressions, and address landmarks.
4. **Mobile is the primary product.** Thumb-friendly controls, short paths, persistent save/contact actions, and strong performance on mid-range devices.
5. **Reduce fear and effort.** Explain unfamiliar terms, show what happens next, and never force an account before the user has found value.
6. **Quality over volume.** Fresh, complete, verified homes rank above duplicated or low-quality supply.

### North-star outcome

**Qualified viewing requests per active home seeker.** This measures successful discovery and trust—not clicks or raw listing volume.

### Supporting success metrics

- Search-to-detail-view rate
- Detail-to-contact rate
- Contact-to-viewing-confirmed rate
- Verified listing share
- Duplicate/stale listing rate
- Saved-home return rate within 7 days
- Median owner response time

## 2. Target users

### Persona 1 — Thiri, young professional looking for a rental

- **Context:** 26, works in Kamayut, searches mostly on Android during commute and evenings.
- **Goal:** Find a furnished apartment near work for 500,000–800,000 MMK/month.
- **Behavior:** Screenshots listings, shares them in Messenger/Viber, calls only after checking photos and exact terms.
- **Pain points:** Fake photos, unclear deposits, “already rented” listings, vague locations, slow agent responses.
- **Product response:** Fast rent search, commute-friendly townships, clear deposit/fees, freshness timestamp, verified contact, save/share without sign-in.

### Persona 2 — Ko Min and Ma Su, family buying a home

- **Context:** Couple in their late 30s with two children; compare homes together over several weeks.
- **Goal:** Buy a safe 3-bedroom home near school and family support.
- **Behavior:** Needs family consensus, repeatedly revisits saved homes, asks about ownership documents and neighborhood access.
- **Pain points:** Price ambiguity, ownership risk, poor comparison tools, missing land/building details.
- **Product response:** Trust checklist, ownership-document status, family-oriented amenities, comparison, shared shortlist, viewing notes, high-quality agent/owner history.

### Persona 3 — Daw Khin, property owner

- **Context:** 52, owns two rental units; comfortable with phone calls but not complex dashboards.
- **Goal:** Find a reliable tenant quickly without being overwhelmed by irrelevant inquiries.
- **Behavior:** Uses a phone, prefers step-by-step listing creation, may send photos through messaging apps.
- **Pain points:** Difficult listing forms, repeated questions, poor-quality leads, uncertainty about pricing.
- **Product response:** Guided listing flow, photo checklist, suggested price range, reusable answers, lead quality signals, simple availability toggle.

### Persona 4 — Aung Zaw, real estate agent

- **Context:** 34, manages 40–80 homes across Yangon with a small team.
- **Goal:** Publish credible inventory, respond faster, and build a trusted reputation.
- **Behavior:** Works from mobile and desktop, updates availability in batches, tracks leads informally.
- **Pain points:** Duplicate data entry, stale inventory, low-intent calls, no portable reputation.
- **Product response:** Inventory dashboard, duplicate detection, team access, response metrics, verified-agent profile, lead inbox, bulk availability updates.

## 3. Core user journeys

### Home seeker — rental

Open app → choose **Rent** → choose township/nearby landmark → set comfortable monthly budget → browse curated homes → open a property story → review verified facts and move-in terms → save/share → contact verified owner → choose call/message → schedule viewing → receive reminder and directions → leave outcome feedback.

### Home seeker — purchase

Open app → choose **Buy** → select family needs and areas → browse suitable homes → review ownership/verification checklist → compare shortlisted homes → contact owner/agent → schedule viewing → add viewing notes → request documentation/legal next steps.

### Property owner

Open owner flow → verify phone and identity → choose rent/sale → add location and landmark → add guided property facts → upload photos with quality tips → review suggested completeness/trust score → publish → respond to inquiries → schedule viewing → mark rented/sold or pause.

### Agent

Sign in → verify professional identity → add/import inventory → resolve duplicate/freshness warnings → publish → receive qualified leads → assign conversations → update availability → build response and trust history.

### Service recovery journey

User spots suspicious or unavailable home → tap **Report** → choose simple reason → listing is down-ranked/pending review → user sees confirmation and safe alternatives → moderation review → outcome is logged against supply quality.

## 4. Information architecture

### Public discovery

- Homepage
  - Intent switch: Rent / Buy
  - Search
  - Popular townships
  - Featured homes
  - Verified homes
  - AI home assistant
- Search
  - Results list
  - Map/list mode
  - Filters
  - Saved search
- Property detail
  - Photos
  - Essential facts
  - Price and terms
  - Location/landmark
  - Amenities
  - Verification and freshness
  - Owner/agent profile
  - Contact and schedule viewing
  - Similar homes
- Saved properties
  - Shortlists
  - Compare
  - Shared shortlist
- Messages
  - Conversations
  - Viewing schedule
- Profile
  - Personal details
  - Preferences
  - Saved searches
  - Language and notifications
  - Safety/report history

### Supply

- Owner dashboard
  - Overview
  - My properties
  - Add/edit property
  - Leads and messages
  - Viewings
  - Performance
  - Verification
- Agent workspace
  - Inventory
  - Team
  - Lead assignment
  - Availability updates
  - Reputation

### Operations

- Admin dashboard
  - Listing review queue
  - Identity/agent verification
  - Duplicate and fraud signals
  - User reports
  - Content/location taxonomy
  - Marketplace health
  - Support cases
  - Audit log and permissions

## 5. MVP feature prioritization

### Must have

- Rent/buy search by city and township
- Budget, property type, bedrooms, furniture, and amenity filters
- Mobile-first results and property details
- Complete MMK pricing and rental terms
- Property photo gallery optimized for low bandwidth
- Phone and message owner/agent actions
- Viewing request with preferred date/time
- Favorites stored locally; account sync after sign-in
- Phone-based authentication
- Owner listing creation and availability controls
- Owner/agent/listing verification states
- Listing freshness timestamp and stale-listing workflow
- Report listing and moderation queue
- English/Myanmar-ready typography and content model
- Basic event analytics and marketplace quality metrics

### Should have

- Saved searches and price/new-home alerts
- Shareable and collaborative shortlists
- Home comparison
- Map/list switch and nearby landmarks
- In-app messaging with quick replies
- Agent team workspace
- Duplicate listing detection
- Photo quality and listing-completeness guidance
- Personalized recommendations from explicit preferences
- Viewing reminders and outcome tracking

### Future

- Conversational AI home assistant with explainable recommendations
- Commute-time and school/hospital proximity tools
- Price guidance and neighborhood market insights
- Digital rental application and tenant screening
- Ownership/document verification partners
- Deposits, booking, rent payments, and escrow where legally viable
- Mortgage and affordability tools
- Virtual tours and AI photo-quality improvement
- Developer/new-project marketplace
- Agent CRM and paid professional tools

## Homepage product direction

The homepage begins with a single emotional promise and a cinematic, credible home—not a wall of listings. Search is presented as four plain-language decisions. Popular townships work as familiar shortcuts. Property cards prioritize image, monthly/total price, essential facts, verification, and freshness. The trust section explains the verification system before asking users to believe it. The AI assistant is framed as a guided conversation, not magic, and always explains why homes are recommended.

### Responsive behavior

- **Desktop:** restrained top navigation, immersive split hero, horizontal property collections, explanatory trust and assistant panels.
- **Mobile:** compact brand/search header, horizontal township chips and cards, shortened copy, sticky bottom navigation, 44px minimum touch targets.
- **Low bandwidth:** first image loads first; additional imagery is lazy; content and verification never depend on images.
