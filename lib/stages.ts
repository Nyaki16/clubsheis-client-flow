import { StageDefinition } from './types'

export const PACKAGES = [
  { value: 'ghutte-only', label: 'Ghutte Only', icon: '⚡', description: 'Onboarding onto Ghutte — platform setup, training, and monthly strategy support.' },
  { value: 'page-build', label: 'New Page Build', icon: '🔨', description: 'A single page build (landing, sales, or opt-in) connected inside Ghutte.' },
  { value: 'content-day', label: 'Content Day', icon: '🎬', description: 'Long and short form videos shot in studio — full pre-production pipeline included.' },
  { value: 'ads-email-social', label: 'Ads + Email + Social', icon: '📣', description: 'Choose any combination: META ads management, email newsletters & automation, and/or social content.' },
  { value: 'full-build', label: 'Full Build', icon: '🚀', description: '3-step funnel: Lead Magnet page, OTO (One Time Offer) page, and Main Product page (course, coaching, etc.).' },
] as const

// Sub-tracks for the Ads + Email + Social package
export const ADS_EMAIL_SOCIAL_TRACKS = [
  { value: 'ads', label: 'Paid Ads', icon: '📣', description: 'META ads management, audience targeting, campaign optimisation' },
  { value: 'email', label: 'Email', icon: '📧', description: 'Newsletters, automations, sequences, deliverability' },
  { value: 'social', label: 'Social Content', icon: '📱', description: 'Content calendar, captions, visuals, scheduling, engagement' },
] as const

export const PACKAGE_BRANCHES: Record<string, string[]> = {
  'ghutte-only': [],
  'page-build': ['page-build'],
  'content-day': ['content-production'],
  'ads-email-social': ['ads-email-social'],
  'full-build': ['page-build'],
}

export const STAGES: StageDefinition[] = [
  {
    key: 'discovery',
    num: '1',
    name: 'Discovery Call',
    summary: 'Understand the lead\'s business, needs, and whether we\'re the right fit. Use the guiding questions below to lead the conversation, then set the lead status to move forward.',
    color: '#B45309',
    colorSoft: 'rgba(180,83,9,0.06)',
    triggerLabel: 'Trigger: Lead books a call',
    triggerColor: 'amber',
    guide: [
      'Tell me about your business — what do you do, who do you serve, and what makes you different?',
      'What are you trying to achieve in the next 3–6 months? (Growth, launch, rebrand, visibility, sales?)',
      'What have you already tried — and what worked or didn\'t work?',
      'What does your current content, marketing, or digital presence look like right now?',
      'What\'s your budget range for this project, and when do you ideally want to start?',
    ],
    substeps: [],
    dataFields: [
      { key: 'what_they_need', label: 'What they need', placeholder: 'Key notes from the discovery call — what are they looking for?', type: 'textarea' },
      { key: 'lead_status', label: 'Lead status', placeholder: 'Select status', type: 'select', options: ['Good Fit — Send Proposal', 'Not a Fit — Send Thank You', 'Follow Up in Two Weeks'] },
      { key: 'transcript_link', label: 'Call transcript / notes link', placeholder: 'Paste Google Drive link or upload notes', type: 'text' },
    ],
    conditionalLogic: [
      { condition: 'Lead status = "Good Fit — Send Proposal"', result: 'Move to Stage 2: Proposal & Scoping' },
      { condition: 'Lead status = "Follow Up in Two Weeks"', result: 'Set reminder, stay in Stage 1' },
      { condition: 'Lead status = "Not a Fit — Send Thank You"', result: 'Send thank you email, archive the client' },
    ],
    nextActionPrompt: 'Discovery call complete. Set the lead status above to determine what happens next.',
  },
  {
    key: 'proposal',
    num: '2',
    name: 'Proposal & Scoping',
    summary: 'Review the AI-generated proposal or thank-you email, make any edits, then send it to the client. Proposals include the ClubSheIs About Us PDF attachment.',
    color: '#2563EB',
    colorSoft: 'rgba(37,99,235,0.06)',
    triggerLabel: 'Trigger: Lead qualified or not a fit',
    triggerColor: 'blue',
    substeps: [],
    dataFields: [],
    conditionalLogic: [
      { condition: 'Proposal sent', result: 'Move to Stage 2B: Proposal Awaiting Review' },
      { condition: 'Email type = "Not a Fit"', result: 'Send thank-you email, archive client' },
    ],
    nextActionPrompt: 'Review and send the email, then move to Awaiting Review.',
  },
  {
    key: 'awaiting-review',
    num: '2B',
    name: 'Proposal Awaiting Review',
    summary: 'The proposal has been sent to the client. Track their response, follow up if needed, and update the status when they reply.',
    color: '#7C3AED',
    colorSoft: 'rgba(124,58,237,0.06)',
    triggerLabel: 'Trigger: Proposal sent',
    triggerColor: 'purple',
    substeps: [],
    dataFields: [
      { key: 'proposal_status', label: 'Proposal status', placeholder: 'Select status', type: 'select', options: ['Sent', 'Viewed', 'Accepted', 'Declined', 'Revising'] },
      { key: 'follow_up_date', label: 'Next follow-up date', placeholder: '', type: 'date' },
      { key: 'client_feedback', label: 'Client feedback / notes', placeholder: 'Any feedback or questions from the client...', type: 'textarea' },
    ],
    guide: [
      'Check if the proposal has been viewed (tracking pixel updates automatically).',
      'If no response after 3 days, send a friendly follow-up.',
      'If they have questions, note them here and schedule a call.',
      'Once they confirm, update status to "Accepted" and move to Onboarding.',
      'If they decline, log the reason and archive the client.',
    ],
    conditionalLogic: [
      { condition: 'Proposal status = "Accepted"', result: 'Move to Stage 3: Client Onboarding' },
      { condition: 'Proposal status = "Revising"', result: 'Go back to Stage 2, update and re-send' },
      { condition: 'Proposal status = "Declined"', result: 'Log reason, archive client' },
      { condition: 'No response after 7 days', result: 'Send follow-up email, flag as "Going Cold"' },
    ],
    nextActionPrompt: 'Waiting for client response. Follow up if no reply within 3-5 days.',
  },
  {
    key: 'onboarding',
    num: '3',
    name: 'Client Onboarding',
    summary: 'Welcome the client, send them a calendar booking link for their strategy session, and collect any brand assets we need before the call.',
    color: '#16A34A',
    colorSoft: 'rgba(22,163,74,0.06)',
    triggerLabel: 'Trigger: Proposal accepted + payment',
    triggerColor: 'green',
    guide: [
      'Send the welcome email within 24 hours — it includes the calendar booking link for the strategy session.',
      'The welcome email sets expectations: what happens next, what we need from them, and the timeline.',
      'Request brand assets, logins, and any existing content from the client.',
      'While waiting for the session, start researching their online presence.',
      'Once the strategy session is booked, prep the facilitator guide.',
    ],
    substeps: [],
    dataFields: [
      { key: 'strategy_session_date', label: 'Strategy session date', placeholder: 'Auto-filled when client books via Ghutte', type: 'date' },
      { key: 'booking_status', label: 'Booking status', placeholder: 'Select', type: 'select', options: ['Awaiting Booking', 'Booked', 'Rescheduled', 'Completed'] },
    ],
    conditionalLogic: [
      { condition: 'Ghutte account created + welcome workflow triggered', result: 'Wait for client to book strategy session' },
      { condition: 'Client books via Ghutte calendar', result: 'Date auto-fills, move to Stage 4: Strategy Session' },
    ],
    nextActionPrompt: 'Create the Ghutte account and trigger the welcome workflow. The strategy session date will auto-fill when the client books.',
  },
  {
    key: 'strategy',
    num: '4',
    name: 'Strategy Session',
    summary: 'Upload the session transcript, then generate three key documents in order: Client Profile → Research Bible → Brand Voice. Each must be reviewed before the next can be created.',
    color: '#9333EA',
    colorSoft: 'rgba(147,51,234,0.06)',
    triggerLabel: 'Trigger: Strategy session completed',
    triggerColor: 'purple',
    guide: [
      'Upload the strategy session transcript or paste your notes — this is the foundation for all three documents.',
      'Step 1: Generate the Client Profile — business info, audience, offers, current state.',
      'Step 2: Generate the Research Bible — deep audience analysis, awareness levels, messaging strategy.',
      'Step 3: Generate the Brand Voice — tone, language patterns, do\'s and don\'ts for content.',
      'Each document must be reviewed and approved before the next one unlocks.',
    ],
    substeps: [],
    dataFields: [
      { key: 'session_date', label: 'Strategy session date', placeholder: 'Select date', type: 'date' },
      { key: 'session_transcript', label: 'Session transcript / notes', placeholder: 'Paste the full transcript or notes from the strategy session...', type: 'textarea' },
    ],
    conditionalLogic: [
      { condition: 'All 3 documents reviewed and approved', result: 'Upload to Google Drive + link to ClickUp, then move to production' },
      { condition: 'Package includes "Page Build"', result: 'Activate Stage 5A: Page Build flow' },
      { condition: 'Package includes "Content Day"', result: 'Activate Stage 5B: Content Day flow' },
      { condition: 'Package includes "Ads / Email / Social"', result: 'Activate Stage 5C: Ads + Email + Social flow' },
      { condition: 'Package = "Full Build"', result: 'Activate ALL branches (5A, 5B, 5C)' },
    ],
    nextActionPrompt: 'Upload the transcript, then generate and review all three documents before moving to production.',
  },
  {
    key: 'page-build',
    num: '5A',
    name: 'Branch: New Page Build',
    summary: 'Build the client\'s landing page, sales page, or website. Copy comes first using the PX Obsessed framework, then design, then build and launch. Max 2 revision rounds each for copy and design.',
    color: '#EA580C',
    colorSoft: 'rgba(234,88,12,0.06)',
    triggerLabel: 'Conditional: Package includes page build',
    triggerColor: 'orange',
    conditional: true,
    conditionPackages: ['page-build', 'full-build'],
    guide: [
      'Always start with copy before design — messaging drives the layout.',
      'Use the Research Bible and client voice to write in their tone.',
      'Get Creative Director approval on copy before starting any design work.',
      'Client gets max 2 revision rounds on copy AND 2 on design — communicate this upfront.',
      'Post-launch: verify analytics, tracking pixels, and form submissions within 48 hours.',
    ],
    substeps: [
      { label: 'Define page type', description: 'Landing page, sales page, opt-in page, homepage, multi-page site.' },
      { label: 'Write page copy', description: 'Using PX Obsessed framework: all 16 sections.' },
      { label: 'Creative Director reviews copy', description: 'Approves messaging, voice, and structure before design.' },
      { label: 'Design the page', description: 'Wireframe, visual design, responsive build.' },
      { label: 'Client reviews', description: 'Feedback, max 2 revision rounds on copy, 2 on design.' },
      { label: 'Build and launch', description: 'Deploy to client hosting/platform, test all links and forms.' },
      { label: 'Post-launch check', description: 'Verify analytics, tracking pixels, form submissions working.' },
    ],
    dataFields: [
      { key: 'page_type', label: 'Page type', placeholder: 'Select type', type: 'select', options: ['Landing', 'Sales', 'Opt-in', 'Homepage', 'Multi-page'] },
      { key: 'platform', label: 'Platform', placeholder: 'Select platform', type: 'select', options: ['WordPress', 'Webflow', 'Shopify', 'Squarespace', 'Custom'] },
      { key: 'copy_status', label: 'Copy status', placeholder: 'Select status', type: 'select', options: ['Drafting', 'In Review', 'Approved'] },
      { key: 'design_status', label: 'Design status', placeholder: 'Select status', type: 'select', options: ['Wireframe', 'Visual', 'Building', 'Live'] },
    ],
    conditionalLogic: [
      { condition: 'Copy approved + Design approved', result: 'Move to build and launch' },
      { condition: 'Client requests revision round 3+', result: 'Flag as out of scope' },
    ],
    nextActionPrompt: 'Page copy approved by Creative Director. Start the visual design.',
  },
  {
    key: 'content-production',
    num: '5B',
    name: 'Branch: Content Production',
    summary: 'The full pre-production pipeline: Creative Brief, Content Plan, Scripts, Production Day, Post-Production, and Delivery. Each step has a gate checkpoint — nothing moves forward without approval.',
    color: '#0D9488',
    colorSoft: 'rgba(13,148,136,0.06)',
    triggerLabel: 'Conditional: Package includes content',
    triggerColor: 'teal',
    conditional: true,
    conditionPackages: ['content-day'],
    guide: [
      'Brief first, then plan, then scripts — never skip a step or work out of order.',
      'Every gate checkpoint needs Creative Director approval before moving on.',
      'Share scripts and shot list with the production team at least 48 hours before the shoot.',
      'Client gets max 2 revision rounds on final deliverables.',
      'For retainer clients, loop back to Step 1 after delivery to start the next month.',
    ],
    substeps: [
      { label: 'Create Creative Brief', description: 'Campaign goal, audience, key message, formats, platforms, deadline.' },
      { label: 'Creative Director approves brief', description: 'Gate checkpoint before planning starts.' },
      { label: 'Build Content Plan', description: 'Content pieces, production schedule, shot list, wardrobe, deliverables checklist.' },
      { label: 'AM reviews plan, CD approves', description: 'Gate checkpoint before scripting.' },
      { label: 'Write scripts', description: 'Long-form video, DTC Reels, ad scripts, webinar scripts. All in client voice.' },
      { label: 'AM reviews, CD approves scripts', description: 'Final gate before production.' },
      { label: 'Production day', description: 'Shoot per shot list. Share scripts + shot list with team 48h before.' },
      { label: 'Post-production', description: 'Editing, colour grading, captions, thumbnails.' },
      { label: 'Client review', description: 'Max 2 revision rounds.' },
      { label: 'Deliver final files', description: 'Upload to client Drive folder, update task status.' },
    ],
    dataFields: [
      { key: 'brief_status', label: 'Brief status', placeholder: 'Select status', type: 'select', options: ['Not Started', 'Drafting', 'In Review', 'Approved'] },
      { key: 'content_plan_status', label: 'Content Plan status', placeholder: 'Select status', type: 'select', options: ['Not Started', 'Drafting', 'In Review', 'Approved'] },
      { key: 'scripts_status', label: 'Scripts status', placeholder: 'Select status', type: 'select', options: ['Not Started', 'Writing', 'In Review', 'Approved'] },
      { key: 'production_date', label: 'Production date', placeholder: 'Shoot date', type: 'date' },
      { key: 'post_production_status', label: 'Post-production', placeholder: 'Select status', type: 'select', options: ['Not Started', 'Editing', 'Review', 'Complete'] },
      { key: 'delivery_status', label: 'Delivery status', placeholder: 'Select status', type: 'select', options: ['Not Delivered', 'Delivered', 'Revisions', 'Approved'] },
    ],
    conditionalLogic: [
      { condition: 'Contract = "Monthly retainer"', result: 'After delivery, loop back to Step 01 for next month' },
      { condition: 'Contract = "Project"', result: 'After delivery, move to Stage 6: Wrap-Up' },
    ],
    nextActionPrompt: 'Content delivered and approved. Start the next month\'s Creative Brief.',
  },
  {
    key: 'ads-email-social',
    num: '5C',
    name: 'Branch: Ads + Email + Social',
    summary: 'Three parallel tracks running simultaneously: Paid Ads, Email Sequences, and Social Content. Each track has its own progress — the Account Manager can see which track needs attention at a glance.',
    color: '#E11D48',
    colorSoft: 'rgba(225,29,72,0.06)',
    triggerLabel: 'Conditional: Package includes ads/email/social',
    triggerColor: 'rose',
    guide: [
      'All three tracks run in parallel — don\'t wait for one to finish before starting another.',
      'Ad creative needs Creative Director sign-off before any campaign goes live.',
      'Test email deliverability and rendering before launching any sequence.',
      'Client reviews social content as a batch — don\'t send posts one at a time.',
      'Generate a consolidated monthly performance report across all three tracks.',
    ],
    conditional: true,
    conditionPackages: ['ads-email-social'],
    parallelTracks: [
      {
        name: 'Paid Ads Track',
        icon: '📣',
        steps: [
          'Define campaign objective & budget',
          'Build audiences (targeting)',
          'Generate ad creative variations',
          'Creative Director approves ad creative',
          'Launch campaigns',
          'Weekly reporting & optimisation',
        ],
      },
      {
        name: 'Email Track',
        icon: '📧',
        steps: [
          'Map email sequence strategy',
          'Write email copy',
          'Creative Director reviews messaging',
          'Build in email platform',
          'Test flows & deliverability',
          'Launch & monitor performance',
        ],
      },
      {
        name: 'Social Track',
        icon: '📱',
        steps: [
          'Build content calendar for the month',
          'Write captions & create visuals',
          'Client reviews content batch',
          'Schedule posts',
          'Community management & engagement',
          'Monthly performance report',
        ],
      },
    ],
    substeps: [
      { label: 'Paid Ads: Define campaign objective & budget', description: 'Set goals, allocate budget across platforms.' },
      { label: 'Paid Ads: Build audiences & targeting', description: 'Create audience segments, lookalikes, retargeting.' },
      { label: 'Paid Ads: Generate ad creative', description: 'Headlines, descriptions, visuals — multiple variations.' },
      { label: 'Paid Ads: CD approves creative', description: 'Sign-off on ad messaging and visuals.' },
      { label: 'Paid Ads: Launch campaigns', description: 'Go live on selected platforms.' },
      { label: 'Paid Ads: Weekly reporting', description: 'Performance review and optimisation.' },
      { label: 'Email: Map sequence strategy', description: 'Welcome, nurture, re-engagement — define the flows.' },
      { label: 'Email: Write copy', description: 'Subject lines, body copy, CTAs for each email.' },
      { label: 'Email: CD reviews messaging', description: 'Ensure voice and strategy alignment.' },
      { label: 'Email: Build in platform', description: 'Set up automations, triggers, segmentation.' },
      { label: 'Email: Test flows', description: 'Deliverability, rendering, link checks.' },
      { label: 'Email: Launch & monitor', description: 'Go live, track opens/clicks/conversions.' },
      { label: 'Social: Build content calendar', description: 'Plan posts for the month across platforms.' },
      { label: 'Social: Write captions & create visuals', description: 'Copy + design for each post.' },
      { label: 'Social: Client reviews batch', description: 'Send for approval before scheduling.' },
      { label: 'Social: Schedule posts', description: 'Queue up in scheduling tool.' },
      { label: 'Social: Community management', description: 'Engage, respond, monitor.' },
      { label: 'Social: Monthly report', description: 'Performance metrics and insights.' },
    ],
    dataFields: [
      { key: 'ads_status', label: 'Paid Ads track', placeholder: 'Select status', type: 'select', options: ['Not Started', 'Setup', 'Live', 'Optimising', 'Complete'] },
      { key: 'email_status', label: 'Email track', placeholder: 'Select status', type: 'select', options: ['Not Started', 'Strategy', 'Writing', 'Building', 'Live', 'Complete'] },
      { key: 'social_status', label: 'Social track', placeholder: 'Select status', type: 'select', options: ['Not Started', 'Planning', 'Creating', 'Scheduling', 'Live', 'Complete'] },
      { key: 'ad_budget', label: 'Ad budget (monthly)', placeholder: 'e.g. R15,000', type: 'text' },
      { key: 'platforms', label: 'Platforms', placeholder: 'e.g. Meta, Google, LinkedIn', type: 'text' },
    ],
    conditionalLogic: [
      { condition: 'All three tracks delivered for the month', result: 'Generate monthly performance report' },
      { condition: 'Retainer active', result: 'Loop back to start of each track for next month' },
    ],
    nextActionPrompt: 'All tracks delivered this month. Generate the monthly performance report.',
  },
  {
    key: 'review',
    num: '6',
    name: 'Client Review & Approval',
    summary: 'Send deliverables to the client for review. Collect feedback, process revisions (max 2 rounds), and get final written sign-off before moving to delivery.',
    guide: [
      'Package all deliverables in the client\'s Drive folder — clearly named and organised.',
      'Send the review email with clear instructions on how to give feedback and the deadline.',
      'Track review status actively — if no response in 3 business days, follow up.',
      'Max 2 revision rounds are included — flag anything beyond as out of scope.',
      'Get written confirmation (email or message) that deliverables are approved.',
    ],
    color: '#2563EB',
    colorSoft: 'rgba(37,99,235,0.06)',
    triggerLabel: 'Trigger: Deliverables ready',
    triggerColor: 'blue',
    substeps: [
      { label: 'Package deliverables', description: 'All files in client Drive folder, clearly named and organised.' },
      { label: 'Send review email', description: 'What\'s included, how to give feedback, deadline for response.' },
      { label: 'Track review status', description: 'Pending Review / Feedback Received / Revisions In Progress / Approved.' },
      { label: 'Process revisions', description: 'Max 2 rounds, each tracked as a subtask.' },
      { label: 'Final client sign-off', description: 'Written confirmation that deliverables are approved.' },
    ],
    dataFields: [
      { key: 'review_status', label: 'Review status', placeholder: 'Select status', type: 'select', options: ['Pending Review', 'Feedback Received', 'Revisions In Progress', 'Approved'] },
      { key: 'revision_round', label: 'Revision round', placeholder: 'Select round', type: 'select', options: ['0 - No revisions', '1', '2', '3+ (Out of scope)'] },
      { key: 'review_deadline', label: 'Review deadline', placeholder: 'Select date', type: 'date' },
      { key: 'client_feedback', label: 'Client feedback notes', placeholder: 'Paste feedback here', type: 'textarea' },
    ],
    conditionalLogic: [
      { condition: 'No client response in 3 business days', result: 'Trigger follow-up reminder' },
      { condition: 'Revision round 3 requested', result: 'Flag: "Out of scope — discuss with CD"' },
      { condition: 'Approved', result: 'Move to Stage 7 (Delivery) or Stage 8 (Retainer) based on contract' },
    ],
    nextActionPrompt: 'Client has approved all deliverables. Move to final delivery.',
  },
  {
    key: 'delivery',
    num: '7',
    name: 'Final Delivery & Handoff',
    summary: 'Ship the final work. Publish pages, launch campaigns, activate email sequences, schedule content. Then verify everything is working within 48 hours.',
    guide: [
      'Ensure all final files are in the correct format in the client\'s Drive folder.',
      'Go-live actions: publish pages, schedule posts, launch ads, activate emails.',
      'Do a post-delivery check within 48 hours — verify links, forms, tracking, and ads.',
      'Send the client a delivery summary confirming everything is live.',
      'Update task status to "Delivered" and log the completion date.',
    ],
    color: '#16A34A',
    colorSoft: 'rgba(22,163,74,0.06)',
    triggerLabel: 'Trigger: Client approved',
    triggerColor: 'green',
    substeps: [
      { label: 'Final file delivery', description: 'All assets in final format in client Drive folder.' },
      { label: 'Go-live actions', description: 'Publish pages, schedule content, launch campaigns, activate emails.' },
      { label: 'Post-delivery check', description: '48 hours after launch: verify links, forms, tracking, ads.' },
      { label: 'Client notification', description: '"Everything is live. Here\'s your delivery summary."' },
      { label: 'Update task status', description: 'Move to "Delivered", log completion date.' },
    ],
    dataFields: [
      { key: 'delivery_date', label: 'Delivery date', placeholder: 'Select date', type: 'date' },
      { key: 'go_live_status', label: 'Go-live status', placeholder: 'Select status', type: 'select', options: ['Not Yet', 'Published', 'Verified'] },
      { key: 'post_check_status', label: 'Post-delivery check', placeholder: 'Select status', type: 'select', options: ['Pending', 'Done — All Good', 'Done — Issues Found'] },
    ],
    conditionalLogic: [
      { condition: 'Contract = "Monthly retainer"', result: 'Move to Stage 8: Monthly Retainer Cycle' },
      { condition: 'Contract = "Project"', result: 'Move to Stage 9: Project Wrap-Up' },
    ],
    nextActionPrompt: 'Delivery complete and verified. Next: retainer cycle or wrap-up.',
  },
  {
    key: 'retainer',
    num: '8',
    name: 'Monthly Retainer Cycle',
    summary: 'End-of-month cycle for retainer clients. Review what was delivered, check performance metrics, confirm scope for next month, verify payment, then kick off the new month\'s work.',
    guide: [
      'Run the month-end review before the last working day of the month.',
      'Pull performance metrics: content engagement, ad ROAS, email open rates, social growth.',
      'Check in with the client — brief call or email: happy? new priorities? scope changes?',
      'Confirm payment is received before starting next month\'s work.',
      'If scope changes, route back to Stage 2 for a revised proposal before continuing.',
    ],
    color: '#9333EA',
    colorSoft: 'rgba(147,51,234,0.06)',
    triggerLabel: 'Trigger: Month-end for retainer clients',
    triggerColor: 'purple',
    conditional: true,
    conditionPackages: ['content-day', 'ads-email-social'],
    substeps: [
      { label: 'Month-end review', description: 'What was delivered, what performed well, what needs adjustment.' },
      { label: 'Performance report', description: 'Content metrics, ad performance, email stats, social growth.' },
      { label: 'Client check-in', description: 'Brief call or email: are they happy? Any new priorities?' },
      { label: 'Scope confirmation', description: 'Same scope next month, or adjustments needed?' },
      { label: 'Invoice / payment check', description: 'Confirm payment received for next month.' },
      { label: 'New month kickoff', description: 'Reset active branches and loop back to Stage 5 flow.' },
    ],
    dataFields: [
      { key: 'month', label: 'Month', placeholder: 'e.g. May 2026', type: 'text' },
      { key: 'scope_change', label: 'Scope change?', placeholder: 'Select', type: 'select', options: ['Same scope', 'Adjusted', 'Cancelled'] },
      { key: 'payment_status', label: 'Payment status', placeholder: 'Select status', type: 'select', options: ['Received', 'Pending', 'Overdue'] },
      { key: 'performance_notes', label: 'Performance notes', placeholder: 'Key wins, issues, adjustments', type: 'textarea' },
    ],
    conditionalLogic: [
      { condition: 'Client confirms same scope', result: 'Loop back to Stage 5 for new month' },
      { condition: 'Client requests scope change', result: 'Return to Stage 2 for revised scope' },
      { condition: 'Client wants to cancel', result: 'Move to Stage 9: Wrap-Up' },
      { condition: 'Payment overdue 7+ days', result: 'Pause all active work, flag AM' },
    ],
    nextActionPrompt: 'Retainer renewed. Start the new month\'s work — create the new brief and calendar.',
  },
  {
    key: 'wrapup',
    num: '9',
    name: 'Project Wrap-Up / Offboarding',
    summary: 'Close the project or offboard the client. Confirm all deliverables are handed over, collect feedback, run an internal retro, archive the project, and add the client to the nurture list for future work.',
    guide: [
      'Confirm every deliverable has been handed over and the client has all access they need.',
      'Collect client feedback — what worked, what didn\'t, would they refer others?',
      'Run an internal team retro — what to keep, improve, and systematise.',
      'Archive the project in ClickUp with full history intact.',
      'Add client to the quarterly nurture list — set a reminder for 3 months.',
    ],
    color: '#B45309',
    colorSoft: 'rgba(180,83,9,0.06)',
    triggerLabel: 'Trigger: Project complete or retainer ended',
    triggerColor: 'amber',
    substeps: [
      { label: 'Final deliverables confirmed', description: 'Everything handed over, all access shared.' },
      { label: 'Client feedback', description: 'Survey or call: what worked, what didn\'t, would they refer others?' },
      { label: 'Internal retro', description: 'Team debrief: keep doing, improve, systematise.' },
      { label: 'Update client profile', description: 'Log final notes, outcomes, future opportunities.' },
      { label: 'Archive in ClickUp', description: 'Move to "Completed" with full history intact.' },
      { label: 'Add to nurture list', description: 'Quarterly check-in reminder for future work.' },
    ],
    dataFields: [
      { key: 'feedback_collected', label: 'Feedback collected', placeholder: 'Select', type: 'select', options: ['Yes', 'No'] },
      { key: 'retro_done', label: 'Internal retro done', placeholder: 'Select', type: 'select', options: ['Yes', 'No'] },
      { key: 'archived', label: 'Archived', placeholder: 'Select', type: 'select', options: ['Yes', 'No'] },
      { key: 'nurture_date', label: 'Next nurture check-in', placeholder: 'Select date', type: 'date' },
      { key: 'outcome_notes', label: 'Outcome notes', placeholder: 'Key results and learnings', type: 'textarea' },
    ],
    conditionalLogic: [],
    nextActionPrompt: 'Project archived. Client added to quarterly nurture list.',
  },
]

export function getActiveStagesForPackage(pkg: string): string[] {
  const core = ['discovery', 'proposal', 'awaiting-review', 'onboarding', 'strategy']
  const closing = ['review', 'delivery']
  const branches = PACKAGE_BRANCHES[pkg] || []

  const retainerPackages = ['content-day', 'ads-email-social']
  const hasRetainer = retainerPackages.includes(pkg)

  // Ghutte Only: just core stages + onboarding-focused, no production branches
  if (pkg === 'ghutte-only') {
    return [...core, ...closing, 'wrapup']
  }

  // Full Build: page build branch (3 pages), no retainer
  if (pkg === 'full-build') {
    return [...core, 'page-build', ...closing, 'wrapup']
  }

  return [
    ...core,
    ...branches,
    ...closing,
    ...(hasRetainer ? ['retainer'] : []),
    'wrapup',
  ]
}

export function getStageByKey(key: string): StageDefinition | undefined {
  return STAGES.find(s => s.key === key)
}

export const STAGE_ORDER = STAGES.map(s => s.key)
