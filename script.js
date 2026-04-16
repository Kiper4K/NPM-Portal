const adminPassword = "Tigers2026!";
const adminSessionKey = "npm-class-2026-admin-session";
const graduationDate = new Date("2026-06-06T18:00:00");
const localDeviceIdKey = "npm-class-2026-device-id";
const tigerImageUrl = "https://cdn.creazilla.com/cliparts/20088/tiger-head-clipart-original.png";

function el(id) {
  return document.getElementById(id);
}

function ensureDeviceId() {
  let deviceId = window.localStorage.getItem(localDeviceIdKey);
  if (!deviceId) {
    deviceId = crypto.randomUUID();
    window.localStorage.setItem(localDeviceIdKey, deviceId);
  }
  return deviceId;
}

function setStatus(message) {
  ["admin-status", "login-status", "account-status", "album-status", "event-status", "fundraiser-status", "profile-tool-status"].forEach((id) => {
    const node = el(id);
    if (node) {
      node.textContent = message;
    }
  });
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatDate(value) {
  if (!value) {
    return "";
  }

  return new Date(value).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric"
  });
}

function formatDateTime(value) {
  if (!value) {
    return "";
  }

  return new Date(value).toLocaleString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

function formatCurrency(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(Number(value || 0));
}

function avatarFor(profile, fallbackName = "Tiger") {
  if (profile?.avatar_url) {
    return profile.avatar_url;
  }

  return tigerImageUrl;
}

function flairFor(profile) {
  return profile?.profile_tag ? `<span class="user-flair">${escapeHtml(profile.profile_tag)}</span>` : "";
}

function updateBanner() {
  const banner = el("banner-track");
  if (!banner) {
    return;
  }

  const featured = state.announcements.find((item) => item.featured) || state.announcements[0];
  banner.textContent = featured
    ? `${featured.category}: ${featured.title} - ${featured.message}`
    : "North Penn-Mansfield Class of 2026 portal is live. Check announcements, plans, and the forum for updates.";
}

function updateGraduationCountdown() {
  const dayNode = el("grad-days");
  const hourNode = el("grad-hours");
  const minuteNode = el("grad-minutes");
  const secondNode = el("grad-seconds");
  if (!dayNode || !hourNode || !minuteNode || !secondNode) {
    return;
  }

  const diff = graduationDate.getTime() - Date.now();
  if (diff <= 0) {
    dayNode.textContent = "000";
    hourNode.textContent = "00";
    minuteNode.textContent = "00";
    secondNode.textContent = "00";
    return;
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const seconds = Math.floor((diff / 1000) % 60);
  dayNode.textContent = String(days).padStart(3, "0");
  hourNode.textContent = String(hours).padStart(2, "0");
  minuteNode.textContent = String(minutes).padStart(2, "0");
  secondNode.textContent = String(seconds).padStart(2, "0");
}

function activeBan() {
  const profile = state.currentProfile;
  if (!profile?.banned_until) {
    return null;
  }

  const bannedUntil = new Date(profile.banned_until);
  if (Number.isNaN(bannedUntil.getTime()) || bannedUntil.getTime() <= Date.now()) {
    return null;
  }

  return {
    until: bannedUntil,
    reason: profile.ban_reason || "A moderator temporarily banned this account."
  };
}

function formatBanTypeLabel(type) {
  switch ((type || "account").toLowerCase()) {
    case "kick":
      return "Temporary Kick";
    case "account":
      return "Account Ban";
    default:
      return "Account Ban";
  }
}

function requireActiveMember(actionText) {
  const ban = activeBan();
  if (!ban) {
    return true;
  }

  renderBanOverlay();
  setStatus(`You are temporarily banned and cannot ${actionText} right now.`);
  return false;
}

async function uploadPublicImage(bucket, ownerId, file) {
  const safeExtension = (file.name.split(".").pop() || "jpg").replace(/[^a-zA-Z0-9]/g, "").toLowerCase() || "jpg";
  const path = `${ownerId}/${Date.now()}-${crypto.randomUUID()}.${safeExtension}`;
  const upload = await supabaseClient.storage.from(bucket).upload(path, file, {
    cacheControl: "3600",
    upsert: false
  });

  if (upload.error) {
    throw upload.error;
  }

  const { data } = supabaseClient.storage.from(bucket).getPublicUrl(path);
  return {
    publicUrl: data.publicUrl,
    path
  };
}

function showSignupSuccessOverlay(email, avatarNeedsLaterUpload = false) {
  const overlay = el("signup-success-overlay");
  const message = el("signup-success-message");
  if (!overlay || !message) {
    return;
  }

  const avatarLine = avatarNeedsLaterUpload
    ? " After you confirm your email and sign in, upload your profile photo from the account page."
    : "";

  message.textContent = `We sent a confirmation email to ${email}. Open that email and click the link to finish creating your account.${avatarLine}`;
  overlay.classList.remove("hidden");
  document.body.style.overflow = "hidden";
}

function hideSignupSuccessOverlay() {
  const overlay = el("signup-success-overlay");
  if (!overlay) {
    return;
  }

  overlay.classList.add("hidden");
  document.body.style.overflow = "";
}

function renderBanOverlay() {
  const currentOverlay = document.querySelector(".ban-overlay");
  if (currentOverlay) {
    currentOverlay.remove();
  }
  if (banTimer) {
    window.clearInterval(banTimer);
    banTimer = null;
  }

  const ban = activeBan();
  if (!ban) {
    return;
  }

  const overlay = document.createElement("div");
  overlay.className = "ban-overlay";
  overlay.innerHTML = `<div class="ban-card"><p class="eyebrow">Temporarily Banned</p><h2>You have been temporarily banned.</h2><p>${escapeHtml(ban.reason)}</p><div class="ban-countdown" id="ban-countdown">Loading...</div><p>You can sign back in when the timer reaches zero.</p></div>`;
  document.body.appendChild(overlay);

  const updateBanCountdown = () => {
    const node = el("ban-countdown");
    if (!node) {
      return;
    }
    const diff = ban.until.getTime() - Date.now();
    if (diff <= 0) {
      node.textContent = "00:00:00";
      overlay.remove();
      return;
    }
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff / (1000 * 60)) % 60);
    const seconds = Math.floor((diff / 1000) % 60);
    node.textContent = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  };

  updateBanCountdown();
  banTimer = window.setInterval(updateBanCountdown, 1000);
}

function attachValidationHint(form) {
  form.addEventListener("invalid", (event) => {
    const label = event.target.name || "This field";
    setStatus(`${label} is required or invalid. Please check the fields marked with *.`);
  }, true);
}

function getAuthRedirectUrl() {
  const origin = window.location.origin || "https://npm26.netlify.app";
  return `${origin}/accounts.html`;
}

const supabaseClient = window.supabase.createClient(
  window.SUPABASE_URL,
  window.SUPABASE_PUBLISHABLE_KEY,
  { auth: { persistSession: true, autoRefreshToken: true } }
);

const state = {
  announcements: [],
  albumItems: [],
  profiles: [],
  plans: [],
  fundraisers: [],
  events: [],
  eventRegistrations: [],
  forumPosts: [],
  replies: [],
  reports: [],
  currentUser: null,
  currentProfile: null,
  adminUnlocked: window.sessionStorage.getItem(adminSessionKey) === "true",
  activeSessions: 1,
  deviceId: ensureDeviceId()
};

let refreshPromise = null;
let banTimer = null;
let graduationTimerStarted = false;

async function loadCurrentUser() {
  const { data, error } = await supabaseClient.auth.getUser();
  if (error) {
    console.error(error);
    state.currentUser = null;
    state.currentProfile = null;
    return;
  }

  state.currentUser = data.user;

  if (!state.currentUser) {
    state.currentProfile = null;
    return;
  }

  const { data: profile, error: profileError } = await supabaseClient
    .from("profiles")
    .select("*")
    .eq("id", state.currentUser.id)
    .maybeSingle();

  if (profileError) {
    console.error(profileError);
    state.currentProfile = null;
    return;
  }

  state.currentProfile = profile;
}

async function ensureProfile() {
  if (!state.currentUser) {
    return;
  }

  if (state.currentProfile) {
    return;
  }

  const metadata = state.currentUser.user_metadata || {};
  const fallbackUsername = metadata.username || (state.currentUser.email ? state.currentUser.email.split("@")[0] : "student");
  const fallbackName = metadata.full_name || fallbackUsername;

  const payload = {
    id: state.currentUser.id,
    email: state.currentUser.email || "",
    username: fallbackUsername,
    full_name: fallbackName,
    avatar_url: metadata.avatar_url || null,
    headline: metadata.headline || null,
    future_plan: metadata.future_plan || null,
    bio: metadata.bio || null
  };

  const { error } = await supabaseClient.from("profiles").upsert(payload);
  if (error) {
    console.error(error);
    return;
  }

  const { data: profile } = await supabaseClient
    .from("profiles")
    .select("*")
    .eq("id", state.currentUser.id)
    .maybeSingle();

  state.currentProfile = profile || null;
}

async function loadPortalData() {
  const [
    announcementsResult,
    albumResult,
    profilesResult,
    plansResult,
    fundraisersResult,
    eventsResult,
    registrationsResult,
    postsResult,
    repliesResult,
    reportsResult
  ] = await Promise.all([
    supabaseClient.from("announcements").select("*").order("featured", { ascending: false }).order("created_at", { ascending: false }).limit(6),
    supabaseClient.from("album_items").select("*").order("created_at", { ascending: false }).limit(9),
    supabaseClient.from("profiles").select("*").order("created_at", { ascending: false }),
    supabaseClient.from("plans").select("*").order("created_at", { ascending: false }).limit(12),
    supabaseClient.from("fundraisers").select("*").order("created_at", { ascending: false }),
    supabaseClient.from("events").select("*").order("starts_at", { ascending: true }),
    supabaseClient.from("event_registrations").select("*").order("created_at", { ascending: false }),
    supabaseClient.from("forum_posts").select("*").order("created_at", { ascending: false }).limit(20),
    supabaseClient.from("forum_replies").select("*").order("created_at", { ascending: true }),
    supabaseClient.from("reports").select("*").eq("status", "open").order("created_at", { ascending: false })
  ]);

  if (announcementsResult.error) console.error(announcementsResult.error);
  if (albumResult.error) console.error(albumResult.error);
  if (profilesResult.error) console.error(profilesResult.error);
  if (plansResult.error) console.error(plansResult.error);
  if (fundraisersResult.error) console.error(fundraisersResult.error);
  if (eventsResult.error) console.error(eventsResult.error);
  if (registrationsResult.error) console.error(registrationsResult.error);
  if (postsResult.error) console.error(postsResult.error);
  if (repliesResult.error) console.error(repliesResult.error);
  if (reportsResult.error) console.error(reportsResult.error);

  state.announcements = announcementsResult.data || [];
  state.albumItems = albumResult.data || [];
  state.profiles = profilesResult.data || [];
  state.plans = plansResult.data || [];
  state.fundraisers = fundraisersResult.data || [];
  state.events = eventsResult.data || [];
  state.eventRegistrations = registrationsResult.data || [];
  state.forumPosts = postsResult.data || [];
  state.replies = repliesResult.data || [];
  state.reports = reportsResult.data || [];
  state.activeSessions = Math.max(1, state.profiles.length || 1);
}

function profileById(id) {
  return state.profiles.find((profile) => profile.id === id) || null;
}

function plansWithAuthors() {
  return state.plans.map((plan) => ({
    ...plan,
    author: profileById(plan.author_id)
  }));
}

function postsWithReplies() {
  return state.forumPosts.map((post) => ({
    ...post,
    author: profileById(post.author_id),
    replies: state.replies.filter((reply) => reply.post_id === post.id).map((reply) => ({
      ...reply,
      author: profileById(reply.author_id)
    }))
  }));
}

function renderAnnouncements() {
  const container = el("announcement-list");
  if (!container) return;

  if (!state.announcements.length) {
    container.innerHTML = '<div class="empty-state">No announcements yet.</div>';
    return;
  }

  container.innerHTML = state.announcements.map((item) => {
    const featuredClass = item.featured ? " featured" : "";
    return `<article class="announcement-card${featuredClass}"><span class="tag">${escapeHtml(item.category)}</span><h4>${escapeHtml(item.title)}</h4><p>${escapeHtml(item.message)}</p></article>`;
  }).join("");
}

function renderAlbum() {
  const container = el("album-list");
  if (!container) return;

  if (!state.albumItems.length) {
    container.innerHTML = '<div class="empty-state">No public album photos yet.</div>';
    return;
  }

  container.innerHTML = state.albumItems.map((item) => `<article class="album-card"><img class="album-image" src="${escapeHtml(item.image_url)}" alt="${escapeHtml(item.title)}"><div class="album-copy"><h4>${escapeHtml(item.title)}</h4><p>${escapeHtml(item.description)}</p><p class="album-meta">Added ${escapeHtml(formatDate(item.created_at))}</p>${state.currentProfile?.is_admin ? `<div class="album-actions"><button type="button" class="text-action danger-action delete-album-item" data-id="${item.id}">Remove photo</button></div>` : ""}</div></article>`).join("");
}

function renderAccounts() {
  const signOutButton = el("sign-out-button");
  const statusCard = el("account-status-card");
  const authPanels = el("auth-panels");
  const profileTools = el("profile-tools");
  if (!signOutButton || !statusCard || !statusCard.firstElementChild) return;

  const profile = state.currentProfile || (state.currentUser ? {
    full_name: state.currentUser.user_metadata?.full_name || state.currentUser.email?.split("@")[0] || "Signed-in user",
    username: state.currentUser.user_metadata?.username || state.currentUser.email?.split("@")[0] || "student",
    avatar_url: state.currentUser.user_metadata?.avatar_url || null,
    headline: state.currentUser.user_metadata?.headline || "",
    future_plan: state.currentUser.user_metadata?.future_plan || ""
  } : null);
  if (profile) {
    statusCard.firstElementChild.className = "account-status-main";
    statusCard.firstElementChild.innerHTML = `<img class="profile-avatar" src="${escapeHtml(avatarFor(profile, profile.full_name))}" alt="${escapeHtml(profile.full_name)}"><div><p class="status-label">Current Account</p><h4>${escapeHtml(profile.full_name)} (@${escapeHtml(profile.username)})${flairFor(profile)}</h4><p>${escapeHtml(profile.headline || "")}${profile.future_plan ? ` | ${escapeHtml(profile.future_plan)}` : ""}</p></div>`;
    signOutButton.classList.remove("hidden");
    if (authPanels) authPanels.classList.add("hidden");
    if (profileTools) profileTools.classList.remove("hidden");
  } else {
    statusCard.firstElementChild.className = "";
    statusCard.firstElementChild.innerHTML = `<p class="status-label">Current Account</p><h4>No one is signed in</h4><p>Create an account or sign in to post in the forum and add your plans.</p>`;
    signOutButton.classList.add("hidden");
    if (authPanels) authPanels.classList.remove("hidden");
    if (profileTools) profileTools.classList.add("hidden");
  }
}

function renderDirectory() {
  const container = el("directory-list");
  if (!container) return;

  if (!state.profiles.length) {
    container.innerHTML = '<div class="empty-state">No student profiles yet.</div>';
    return;
  }

  container.innerHTML = state.profiles.map((profile) => `<article class="directory-card"><div class="profile-row"><img class="profile-avatar" src="${escapeHtml(avatarFor(profile, profile.full_name))}" alt="${escapeHtml(profile.full_name)}"><div><h4>${escapeHtml(profile.full_name)}${flairFor(profile)}</h4><p class="tag">@${escapeHtml(profile.username)}</p></div></div><p>${escapeHtml(profile.headline || "")}</p><div class="directory-meta"><span><strong>Future:</strong> ${escapeHtml(profile.future_plan || "TBD")}</span><span>${escapeHtml(profile.bio || "")}</span></div></article>`).join("");
}

function renderPlans() {
  const container = el("plan-list");
  if (!container) return;

  const plans = plansWithAuthors();
  if (!plans.length) {
    container.innerHTML = '<div class="empty-state">No plans have been posted yet.</div>';
    return;
  }

  container.innerHTML = plans.map((plan) => `<article class="plan-item"><span class="tag">${escapeHtml(plan.category)}</span><h4>${escapeHtml(plan.title)}</h4><p>${escapeHtml(plan.details)}</p><p class="plan-meta">@${escapeHtml(plan.author?.username || "student")}${flairFor(plan.author)} | ${escapeHtml(formatDate(plan.created_at))}</p>${state.currentUser?.id === plan.author_id ? `<div class="forum-actions"><button type="button" class="text-action danger-action delete-plan" data-id="${plan.id}">Delete plan</button></div>` : ""}</article>`).join("");
}

function renderFundraisers() {
  const container = el("fundraiser-list");
  if (!container) return;

  if (!state.fundraisers.length) {
    container.innerHTML = '<div class="empty-state">No fundraisers have been posted yet.</div>';
    return;
  }

  container.innerHTML = state.fundraisers.map((item) => {
    const goal = Number(item.goal_amount || 0);
    const current = Number(item.current_amount || 0);
    const percent = goal > 0 ? Math.min(100, Math.round((current / goal) * 100)) : 0;
    return `<article class="portal-card"><span class="tag">Fundraiser</span><h4>${escapeHtml(item.title)}</h4><p>${escapeHtml(item.description)}</p><div class="fundraiser-progress"><div class="fundraiser-progress-bar" style="width:${percent}%"></div></div><div class="fundraiser-stats"><span>${escapeHtml(formatCurrency(current))} raised</span><span>${escapeHtml(formatCurrency(goal))} goal</span><span>${percent}% complete</span>${item.ends_on ? `<span>Ends ${escapeHtml(formatDate(item.ends_on))}</span>` : ""}</div>${state.currentProfile?.is_admin ? `<div class="forum-actions"><button type="button" class="text-action update-fundraiser" data-id="${item.id}">Update progress</button></div>` : ""}</article>`;
  }).join("");
}

function renderEvents() {
  const container = el("event-list");
  if (!container) return;

  if (!state.events.length) {
    container.innerHTML = '<div class="empty-state">No events have been posted yet.</div>';
    return;
  }

  container.innerHTML = state.events.map((eventItem) => {
    const registrationCount = state.eventRegistrations.filter((registration) => registration.event_id === eventItem.id).length;
    const alreadyRegistered = state.currentUser ? state.eventRegistrations.some((registration) => registration.event_id === eventItem.id && registration.profile_id === state.currentUser.id) : false;
    const spacesText = eventItem.capacity ? `${registrationCount}/${eventItem.capacity} registered` : `${registrationCount} registered`;
    return `<article class="portal-card"><span class="tag">Event</span><h4>${escapeHtml(eventItem.title)}</h4><p>${escapeHtml(eventItem.description)}</p><div class="event-meta-list"><span>${escapeHtml(formatDateTime(eventItem.starts_at))}</span><span>${escapeHtml(eventItem.location)}</span><span>${escapeHtml(spacesText)}</span></div><div class="forum-actions">${eventItem.google_form_url ? `<a class="button button-secondary" href="${escapeHtml(eventItem.google_form_url)}" target="_blank" rel="noreferrer">Open Google Form</a>` : ""}<button type="button" class="button button-primary register-event" data-id="${eventItem.id}" ${alreadyRegistered ? "disabled" : ""}>${alreadyRegistered ? "Registered" : "Register"}</button></div></article>`;
  }).join("");
}

function renderHeroAccountButton() {
  const button = el("hero-create-account");
  if (!button) {
    return;
  }

  if (state.currentUser) {
    button.classList.add("hidden");
  } else {
    button.classList.remove("hidden");
  }
}

function renderTopbarProfile() {
  const link = el("topbar-profile-link");
  const avatar = el("topbar-profile-avatar");
  const name = el("topbar-profile-name");
  if (!link || !avatar || !name) {
    return;
  }

  const profile = state.currentProfile || (state.currentUser ? {
    full_name: state.currentUser.user_metadata?.full_name || state.currentUser.email?.split("@")[0] || "My Account",
    avatar_url: state.currentUser.user_metadata?.avatar_url || null
  } : null);

  if (profile) {
    avatar.src = avatarFor(profile, profile.full_name);
    avatar.alt = `${profile.full_name} profile picture`;
    name.textContent = profile.full_name;
    link.classList.remove("hidden");
  } else {
    link.classList.add("hidden");
  }

  document.querySelectorAll(".admin-link").forEach((node) => {
    node.classList.toggle("hidden", !state.currentProfile?.is_admin);
  });
}

function populateProfileForm() {
  const form = el("profile-edit-form");
  if (!form || !state.currentProfile) {
    return;
  }

  form.elements.full_name.value = state.currentProfile.full_name || "";
  form.elements.username.value = state.currentProfile.username || "";
  form.elements.headline.value = state.currentProfile.headline || "";
  form.elements.future_plan.value = state.currentProfile.future_plan || "";
  form.elements.bio.value = state.currentProfile.bio || "";
}

function renderForum() {
  const container = el("forum-list");
  if (!container) return;

  const posts = postsWithReplies().sort((a, b) => (b.votes || 0) - (a.votes || 0));
  if (!posts.length) {
    container.innerHTML = '<div class="empty-state">No threads yet. Start the conversation.</div>';
    return;
  }

  container.innerHTML = posts.map((post) => {
    const replies = post.replies.map((reply) => `<div class="reply-item"><div class="reply-head"><img class="profile-avatar small" src="${escapeHtml(avatarFor(reply.author, reply.author?.full_name || "Tiger"))}" alt="${escapeHtml(reply.author?.full_name || "Tiger")}"><div><strong>${escapeHtml(reply.author?.full_name || "Student")}</strong>${flairFor(reply.author)}<div class="reply-meta">@${escapeHtml(reply.author?.username || "student")} | ${escapeHtml(formatDate(reply.created_at))}</div></div></div><p>${escapeHtml(reply.body)}</p>${state.currentUser?.id === reply.author_id ? `<div class="forum-actions"><button type="button" class="text-action danger-action delete-reply" data-id="${reply.id}">Delete reply</button></div>` : ""}</div>`).join("");
    return `<article class="forum-post"><div class="forum-post-header"><span class="tag">${escapeHtml(post.category)}</span><span class="forum-meta">${post.votes || 0} upvotes</span></div><div class="profile-row"><img class="profile-avatar small" src="${escapeHtml(avatarFor(post.author, post.author?.full_name || "Tiger"))}" alt="${escapeHtml(post.author?.full_name || "Tiger")}"><div><h4>${escapeHtml(post.title)}</h4><p class="forum-meta">@${escapeHtml(post.author?.username || "student")}${flairFor(post.author)} | ${escapeHtml(formatDate(post.created_at))}</p></div></div><p>${escapeHtml(post.body)}</p><div class="forum-actions"><button type="button" class="text-action vote-button" data-id="${post.id}" data-change="1">Upvote</button><button type="button" class="text-action vote-button" data-id="${post.id}" data-change="-1">Downvote</button><button type="button" class="text-action reply-toggle" data-id="${post.id}">Reply</button><button type="button" class="text-action report-toggle" data-id="${post.id}">Report</button>${state.currentUser?.id === post.author_id ? `<button type="button" class="text-action danger-action delete-post" data-id="${post.id}">Delete post</button>` : ""}</div><form class="reply-form-inline admin-hidden" data-reply-form="${post.id}"><textarea name="reply" placeholder="Write a reply..." required></textarea><button type="submit" class="button button-secondary">Post reply</button></form><form class="reply-form-inline report-form" data-report-form="${post.id}"><textarea name="reason" placeholder="Tell the admin why you are reporting this post..." required></textarea><button type="submit" class="button button-secondary">Submit report</button></form><div class="forum-replies">${replies || '<div class="empty-state">No replies yet.</div>'}</div></article>`;
  }).join("");
}

function renderReports() {
  const container = el("report-list");
  if (!container) return;

  if (!state.reports.length) {
    container.innerHTML = '<div class="empty-state">No reported posts right now.</div>';
    return;
  }

  container.innerHTML = state.reports.map((report) => `<article class="report-item"><h4>${escapeHtml(report.title)}</h4><p>${escapeHtml(report.reason)}</p><div class="report-actions"><button type="button" class="text-action dismiss-report" data-id="${report.id}">Dismiss</button><button type="button" class="text-action remove-post" data-post-id="${report.post_id}" data-report-id="${report.id}">Remove post</button></div></article>`).join("");
}

function renderUserModeration() {
  const container = el("user-admin-list");
  if (!container) {
    return;
  }

  if (!state.profiles.length) {
    container.innerHTML = '<div class="empty-state">No users found.</div>';
    return;
  }

  container.innerHTML = state.profiles.map((profile) => {
    const bannedUntil = profile.banned_until ? formatDate(profile.banned_until) : "Not banned";
    return `<div class="admin-user-card"><div class="profile-row"><img class="profile-avatar small" src="${escapeHtml(avatarFor(profile, profile.full_name))}" alt="${escapeHtml(profile.full_name)}"><div><strong>${escapeHtml(profile.full_name)}</strong>${flairFor(profile)}<div class="admin-user-meta">@${escapeHtml(profile.username)} | ${escapeHtml(profile.email || "")}</div></div></div><div class="admin-user-meta">Ban status: ${escapeHtml(profile.ban_type ? `${formatBanTypeLabel(profile.ban_type)} until ${bannedUntil}` : bannedUntil)}${profile.ban_reason ? ` | ${escapeHtml(profile.ban_reason)}` : ""}</div><div class="admin-user-actions"><button type="button" class="text-action set-tag" data-id="${profile.id}">Set tag</button><button type="button" class="text-action temp-ban" data-id="${profile.id}" data-days="1" data-ban-type="account">Ban 1 day</button><button type="button" class="text-action temp-ban" data-id="${profile.id}" data-days="7" data-ban-type="account">Ban 7 days</button><button type="button" class="text-action temp-ban" data-id="${profile.id}" data-days="0" data-ban-type="kick">Kick 1 hour</button><button type="button" class="text-action" data-unban-id="${profile.id}">Unban</button></div></div>`;
  }).join("");
}

function renderMetrics() {
  const posts = postsWithReplies();
  const metrics = {
    "stat-students": String(state.profiles.length).padStart(3, "0"),
    "stat-posts": String(posts.length).padStart(2, "0"),
    "stat-plans": String(state.plans.length).padStart(2, "0"),
    "live-visitors": `${state.activeSessions} active profiles`,
    "metric-accounts": `${state.profiles.length} registered`,
    "metric-reports": `${state.reports.length} open reports`,
    "metric-content": `${state.plans.length + posts.length} items total`
  };

  Object.entries(metrics).forEach(([id, value]) => {
    const node = el(id);
    if (node) {
      node.textContent = value;
    }
  });
}

function updateAdminView() {
  const loginCard = el("admin-login-card");
  const adminContent = el("admin-content");
  if (!loginCard || !adminContent) return;

  const allowed = state.adminUnlocked && state.currentProfile?.is_admin && !activeBan();
  if (allowed) {
    loginCard.classList.add("admin-hidden");
    adminContent.classList.remove("admin-hidden");
    adminContent.setAttribute("aria-hidden", "false");
  } else {
    loginCard.classList.remove("admin-hidden");
    adminContent.classList.add("admin-hidden");
    adminContent.setAttribute("aria-hidden", "true");
  }
}

function renderBannedPage() {
  const page = el("banned-page");
  if (!page) {
    return;
  }

  const ban = activeBan();
  if (!ban || !state.currentUser || !state.currentProfile) {
    return;
  }

  const nameNode = el("banned-user-name");
  const typeNode = el("banned-type");
  const reasonNode = el("banned-reason");
  const timerNode = el("banned-timer");
  if (nameNode) nameNode.textContent = state.currentProfile.full_name || state.currentUser.email || "This account";
  if (typeNode) typeNode.textContent = formatBanTypeLabel(ban.type);
  if (reasonNode) reasonNode.textContent = ban.reason;

  const updateCountdown = () => {
    if (!timerNode) {
      return;
    }
    const diff = ban.until.getTime() - Date.now();
    if (diff <= 0) {
      timerNode.textContent = "00:00:00";
      window.location.replace("accounts.html");
      return;
    }
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff / (1000 * 60)) % 60);
    const seconds = Math.floor((diff / 1000) % 60);
    timerNode.textContent = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  };

  updateCountdown();
}

function protectBanRoute() {
  const path = window.location.pathname.toLowerCase();
  const isBannedPage = path.endsWith("/banned.html") || path.endsWith("\\banned.html") || path.endsWith("/banned");
  const ban = activeBan();

  if (ban && !isBannedPage) {
    window.location.replace("banned.html");
    return;
  }

  if (!ban && isBannedPage) {
    window.location.replace(state.currentUser ? "index.html" : "accounts.html");
  }
}

function protectAdminRoute() {
  const isAdminPage = window.location.pathname.toLowerCase().endsWith("/admin.html")
    || window.location.pathname.toLowerCase().endsWith("\\admin.html")
    || window.location.pathname.toLowerCase().endsWith("/admin");
  if (!isAdminPage) {
    return;
  }

  if (state.currentProfile?.is_admin) {
    return;
  }

  const destination = state.currentUser ? "index.html" : "accounts.html";
  window.location.replace(destination);
}

function renderAll() {
  renderAnnouncements();
  renderAlbum();
  renderAccounts();
  renderDirectory();
  renderPlans();
  renderFundraisers();
  renderEvents();
  renderForum();
  renderReports();
  renderUserModeration();
  renderMetrics();
  updateAdminView();
  renderTopbarProfile();
  populateProfileForm();
  updateBanner();
  updateGraduationCountdown();
  protectBanRoute();
  renderBanOverlay();
  renderBannedPage();
  protectAdminRoute();
}

async function refreshAndRender() {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    await loadCurrentUser();
    await ensureProfile();
    await loadPortalData();
    renderAll();
  })();

  try {
    await refreshPromise;
  } finally {
    refreshPromise = null;
  }
}

const accountForm = el("account-form");
if (accountForm) {
  attachValidationHint(accountForm);
  accountForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const email = formData.get("email").toString().trim().toLowerCase();
    const password = formData.get("password").toString().trim();
    const username = formData.get("username").toString().trim().toLowerCase();
    const avatarFile = accountForm.querySelector("input[name='avatarFile']")?.files?.[0] || null;

    const signupMetadata = {
      username,
      full_name: formData.get("name").toString().trim(),
      avatar_url: formData.get("avatar").toString().trim(),
      headline: formData.get("headline").toString().trim(),
      future_plan: formData.get("future").toString().trim(),
      bio: formData.get("bio").toString().trim()
    };

    const { data, error } = await supabaseClient.auth.signUp({
      email,
      password,
      options: {
        data: signupMetadata,
        emailRedirectTo: getAuthRedirectUrl()
      }
    });
    if (error) {
      setStatus(error.message);
      return;
    }

    let avatarUploaded = false;
    if (avatarFile && data.session && data.user?.id) {
      try {
        const uploadData = await uploadPublicImage("avatars", data.user.id, avatarFile);
        const profileUpdate = await supabaseClient
          .from("profiles")
          .update({ avatar_url: uploadData.publicUrl })
          .eq("id", data.user.id);

        if (!profileUpdate.error) {
          avatarUploaded = true;
        }
      } catch (uploadError) {
        console.error(uploadError);
      }
    }

    event.currentTarget.reset();
    setStatus("");
    await refreshAndRender();
    showSignupSuccessOverlay(email, Boolean(avatarFile) && !avatarUploaded);
  });
}

const loginForm = el("login-form");
if (loginForm) {
  attachValidationHint(loginForm);
  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const email = formData.get("email").toString().trim().toLowerCase();
    const password = formData.get("password").toString().trim();

    const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) {
      setStatus(error.message);
      return;
    }

    await refreshAndRender();
    event.currentTarget.reset();
    setStatus(activeBan() ? "Signed in, but this account is temporarily banned." : "Signed in successfully.");
  });
}

const googleSignInButton = el("google-signin-button");
if (googleSignInButton) {
  googleSignInButton.addEventListener("click", async () => {
    const { error } = await supabaseClient.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: getAuthRedirectUrl()
      }
    });

    if (error) {
      setStatus(error.message);
    }
  });
}

const signupSuccessClose = el("signup-success-close");
if (signupSuccessClose) {
  signupSuccessClose.addEventListener("click", hideSignupSuccessOverlay);
}

const signupSuccessOverlay = el("signup-success-overlay");
if (signupSuccessOverlay) {
  signupSuccessOverlay.addEventListener("click", (event) => {
    if (event.target === signupSuccessOverlay) {
      hideSignupSuccessOverlay();
    }
  });
}

const banAppealForm = el("ban-appeal-form");
if (banAppealForm) {
  banAppealForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!state.currentUser || !state.currentProfile) {
      return;
    }

    const appealStatus = el("ban-appeal-status");
    const formData = new FormData(event.currentTarget);
    const message = formData.get("appeal_message").toString().trim();
    if (!message) {
      if (appealStatus) appealStatus.textContent = "Write your appeal before sending it.";
      return;
    }

    const ban = activeBan();
    const { error } = await supabaseClient.from("ban_appeals").insert({
      profile_id: state.currentUser.id,
      email: state.currentUser.email || state.currentProfile.email || null,
      ban_type: ban?.type || "account",
      ban_reason: ban?.reason || null,
      appeal_message: message
    });

    if (error) {
      if (appealStatus) appealStatus.textContent = error.message;
      return;
    }

    event.currentTarget.reset();
    if (appealStatus) appealStatus.textContent = "Appeal sent. An admin can review it in Supabase.";
  });
}

const signOutButton = el("sign-out-button");
if (signOutButton) {
  signOutButton.addEventListener("click", async () => {
    await supabaseClient.auth.signOut();
    await refreshAndRender();
    setStatus("You signed out.");
  });
}

const avatarUploadForm = el("avatar-upload-form");
if (avatarUploadForm) {
  attachValidationHint(avatarUploadForm);
  avatarUploadForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!state.currentUser) {
      setStatus("Sign in before uploading a profile photo.");
      return;
    }
    if (!requireActiveMember("upload a profile photo")) {
      return;
    }

    const fileInput = avatarUploadForm.querySelector("input[name='avatarFile']");
    const file = fileInput?.files?.[0];
    if (!file) {
      setStatus("Choose a profile photo first.");
      return;
    }

    let uploadData;
    try {
      uploadData = await uploadPublicImage("avatars", state.currentUser.id, file);
    } catch (error) {
      setStatus(error.message || "Could not upload that profile photo.");
      return;
    }

    const { error } = await supabaseClient
      .from("profiles")
      .update({ avatar_url: uploadData.publicUrl })
      .eq("id", state.currentUser.id);

    if (error) {
      setStatus(error.message);
      return;
    }

    await refreshAndRender();
    avatarUploadForm.reset();
    setStatus("Profile photo uploaded.");
  });
}

const profileEditForm = el("profile-edit-form");
if (profileEditForm) {
  attachValidationHint(profileEditForm);
  profileEditForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!state.currentUser || !state.currentProfile) {
      setStatus("Sign in before editing your profile.");
      return;
    }
    if (!requireActiveMember("edit your profile")) {
      return;
    }

    const formData = new FormData(event.currentTarget);
    const updates = {
      full_name: formData.get("full_name").toString().trim(),
      username: formData.get("username").toString().trim().toLowerCase(),
      headline: formData.get("headline").toString().trim(),
      future_plan: formData.get("future_plan").toString().trim(),
      bio: formData.get("bio").toString().trim()
    };

    const { error } = await supabaseClient
      .from("profiles")
      .update(updates)
      .eq("id", state.currentUser.id);

    if (error) {
      setStatus(error.message);
      return;
    }

    await refreshAndRender();
    setStatus("Profile updated.");
  });
}

const planForm = el("plan-form");
if (planForm) {
  attachValidationHint(planForm);
  planForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!state.currentUser) {
      setStatus("Sign in before posting an after-graduation plan.");
      return;
    }
    if (!requireActiveMember("post an after-graduation plan")) {
      return;
    }

    const formData = new FormData(event.currentTarget);
    const { error } = await supabaseClient.from("plans").insert({
      author_id: state.currentUser.id,
      title: formData.get("title").toString().trim(),
      category: formData.get("category").toString().trim(),
      details: formData.get("details").toString().trim()
    });

    if (error) {
      setStatus(error.message);
      return;
    }

    await refreshAndRender();
    event.currentTarget.reset();
    setStatus("Your after-graduation plan has been posted.");
  });
}

const forumForm = el("forum-form");
if (forumForm) {
  attachValidationHint(forumForm);
  forumForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!state.currentUser) {
      setStatus("Sign in before posting in Tiger Talk.");
      return;
    }
    if (!requireActiveMember("post in Tiger Talk")) {
      return;
    }

    const formData = new FormData(event.currentTarget);
    const { error } = await supabaseClient.from("forum_posts").insert({
      author_id: state.currentUser.id,
      category: formData.get("category").toString().trim(),
      title: formData.get("title").toString().trim(),
      body: formData.get("body").toString().trim(),
      votes: 1
    });

    if (error) {
      setStatus(error.message);
      return;
    }

    await refreshAndRender();
    event.currentTarget.reset();
    setStatus("Your forum thread has been posted.");
  });
}

const adminLoginForm = el("admin-login-form");
if (adminLoginForm) {
  attachValidationHint(adminLoginForm);
  adminLoginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const password = formData.get("password").toString().trim();

    if (!state.currentProfile?.is_admin) {
      setStatus("Sign in with an admin account first.");
      return;
    }
    if (!requireActiveMember("unlock the admin panel")) {
      return;
    }

    if (password !== adminPassword) {
      setStatus("Incorrect admin password. Try again.");
      return;
    }

    state.adminUnlocked = true;
    window.sessionStorage.setItem(adminSessionKey, "true");
    renderAll();
    event.currentTarget.reset();
    setStatus("Admin panel unlocked.");
  });
}

const announcementForm = el("announcement-form");
if (announcementForm) {
  attachValidationHint(announcementForm);
  announcementForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!state.currentProfile?.is_admin) {
      setStatus("Only admin accounts can post announcements.");
      return;
    }

    const formData = new FormData(event.currentTarget);
    const { error } = await supabaseClient.from("announcements").insert({
      category: formData.get("category").toString().trim(),
      title: formData.get("title").toString().trim(),
      message: formData.get("message").toString().trim(),
      featured: formData.get("featured") === "on"
    });

    if (error) {
      setStatus(error.message);
      return;
    }

    await refreshAndRender();
    event.currentTarget.reset();
    setStatus("Announcement posted to the homepage.");
  });
}

function bindAlbumForm(form) {
  if (!form) {
    return;
  }

  attachValidationHint(form);
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!state.currentUser) {
      setStatus("Sign in before adding a photo to the album.");
      return;
    }
    if (!requireActiveMember("add album photos")) {
      return;
    }

    const formData = new FormData(event.currentTarget);
    const file = form.querySelector("input[name='imageFile']")?.files?.[0] || null;
    const imageUrlField = formData.get("imageUrl");
    const rawImageUrl = typeof imageUrlField === "string" ? imageUrlField.trim() : "";
    let imageUrl = rawImageUrl;
    let storagePath = null;

    if (file) {
      try {
        const uploadData = await uploadPublicImage("album-photos", state.currentUser.id, file);
        imageUrl = uploadData.publicUrl;
        storagePath = uploadData.path;
      } catch (error) {
        setStatus(error.message || "Could not upload that photo.");
        return;
      }
    }

    if (!imageUrl) {
      setStatus("Upload a photo or paste an image URL.");
      return;
    }

    const { error } = await supabaseClient.from("album_items").insert({
      title: formData.get("title").toString().trim(),
      description: formData.get("description").toString().trim(),
      image_url: imageUrl,
      storage_path: storagePath,
      created_by: state.currentUser.id
    });

    if (error) {
      setStatus(error.message);
      return;
    }

    await refreshAndRender();
    event.currentTarget.reset();
    setStatus("Photo added to the public album.");
  });
}

bindAlbumForm(el("album-form"));
bindAlbumForm(el("public-album-form"));

const fundraiserForm = el("fundraiser-form");
if (fundraiserForm) {
  attachValidationHint(fundraiserForm);
  fundraiserForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!state.currentProfile?.is_admin) {
      setStatus("Only admin accounts can manage fundraisers.");
      return;
    }

    const formData = new FormData(event.currentTarget);
    const { error } = await supabaseClient.from("fundraisers").insert({
      title: formData.get("title").toString().trim(),
      description: formData.get("description").toString().trim(),
      goal_amount: Number(formData.get("goal_amount")),
      current_amount: Number(formData.get("current_amount")),
      ends_on: formData.get("ends_on")?.toString().trim() || null
    });

    if (error) {
      setStatus(error.message);
      return;
    }

    await refreshAndRender();
    event.currentTarget.reset();
    setStatus("Fundraiser saved.");
  });
}

const eventForm = el("event-form");
if (eventForm) {
  attachValidationHint(eventForm);
  eventForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!state.currentProfile?.is_admin) {
      setStatus("Only admin accounts can manage events.");
      return;
    }

    const formData = new FormData(event.currentTarget);
    const { error } = await supabaseClient.from("events").insert({
      title: formData.get("title").toString().trim(),
      description: formData.get("description").toString().trim(),
      starts_at: formData.get("starts_at").toString(),
      location: formData.get("location").toString().trim(),
      capacity: formData.get("capacity") ? Number(formData.get("capacity")) : null,
      google_form_url: formData.get("google_form_url")?.toString().trim() || null
    });

    if (error) {
      setStatus(error.message);
      return;
    }

    await refreshAndRender();
    event.currentTarget.reset();
    setStatus("Event posted.");
  });
}

const clearReportsButton = el("clear-reports");
if (clearReportsButton) {
  clearReportsButton.addEventListener("click", async () => {
    if (!state.currentProfile?.is_admin) {
      setStatus("Only admin accounts can clear reports.");
      return;
    }

    const ids = state.reports.map((report) => report.id);
    if (!ids.length) {
      setStatus("No reports to clear.");
      return;
    }

    const { error } = await supabaseClient.from("reports").update({ status: "closed" }).in("id", ids);
    if (error) {
      setStatus(error.message);
      return;
    }

    await refreshAndRender();
    setStatus("All reports cleared.");
  });
}

const resetContentButton = el("reset-content");
if (resetContentButton) {
  resetContentButton.addEventListener("click", () => {
    setStatus("Reset all content is disabled once the site uses Supabase. Manage records directly in Supabase if needed.");
  });
}

const seedDemoButton = el("seed-demo-data");
if (seedDemoButton) {
  seedDemoButton.addEventListener("click", () => {
    setStatus("Demo seeding is now handled by the SQL setup file instead of the browser.");
  });
}

const adminLogoutButton = el("admin-logout");
if (adminLogoutButton) {
  adminLogoutButton.addEventListener("click", () => {
    state.adminUnlocked = false;
    window.sessionStorage.removeItem(adminSessionKey);
    renderAll();
    setStatus("Admin panel locked.");
  });
}

document.addEventListener("click", async (event) => {
  const replyToggle = event.target.closest(".reply-toggle");
  if (replyToggle) {
    const postId = replyToggle.dataset.id;
    const replyForm = document.querySelector(`[data-reply-form="${postId}"]`);
    if (replyForm) {
      replyForm.classList.toggle("admin-hidden");
    }
    return;
  }

  const reportToggle = event.target.closest(".report-toggle");
  if (reportToggle) {
    const postId = reportToggle.dataset.id;
    const reportForm = document.querySelector(`[data-report-form="${postId}"]`);
    if (reportForm) {
      reportForm.classList.toggle("active");
    }
    return;
  }

  const voteButton = event.target.closest(".vote-button");
  if (voteButton) {
    if (!requireActiveMember("vote on forum posts")) {
      return;
    }
    const postId = Number(voteButton.dataset.id);
    const change = Number(voteButton.dataset.change);
    const currentPost = state.forumPosts.find((post) => post.id === postId);
    if (!currentPost) return;

    const { error } = await supabaseClient.from("forum_posts").update({ votes: Math.max(0, (currentPost.votes || 0) + change) }).eq("id", postId);
    if (error) {
      setStatus(error.message);
      return;
    }

    await refreshAndRender();
    return;
  }

  const dismissButton = event.target.closest(".dismiss-report");
  if (dismissButton) {
    if (!state.currentProfile?.is_admin) {
      setStatus("Only admin accounts can dismiss reports.");
      return;
    }

    const reportId = Number(dismissButton.dataset.id);
    const { error } = await supabaseClient.from("reports").update({ status: "closed" }).eq("id", reportId);
    if (error) {
      setStatus(error.message);
      return;
    }

    await refreshAndRender();
    setStatus("Report dismissed.");
    return;
  }

  const removeButton = event.target.closest(".remove-post");
  if (removeButton) {
    if (!state.currentProfile?.is_admin) {
      setStatus("Only admin accounts can remove posts.");
      return;
    }

    const postId = Number(removeButton.dataset.postId);
    const reportId = Number(removeButton.dataset.reportId);

    const deleteReplies = await supabaseClient.from("forum_replies").delete().eq("post_id", postId);
    if (deleteReplies.error) {
      setStatus(deleteReplies.error.message);
      return;
    }

    const deletePost = await supabaseClient.from("forum_posts").delete().eq("id", postId);
    if (deletePost.error) {
      setStatus(deletePost.error.message);
      return;
    }

    await supabaseClient.from("reports").update({ status: "closed" }).eq("id", reportId);
    await refreshAndRender();
    setStatus("Post removed by admin.");
  }

  const deletePostButton = event.target.closest(".delete-post");
  if (deletePostButton) {
    if (!requireActiveMember("delete posts")) {
      return;
    }
    const postId = Number(deletePostButton.dataset.id);
    const post = state.forumPosts.find((item) => item.id === postId);
    if (!post || post.author_id !== state.currentUser?.id) {
      setStatus("You can only delete your own posts.");
      return;
    }

    await supabaseClient.from("forum_replies").delete().eq("post_id", postId);
    const { error } = await supabaseClient.from("forum_posts").delete().eq("id", postId);
    if (error) {
      setStatus(error.message);
      return;
    }

    await refreshAndRender();
    setStatus("Your post was deleted.");
    return;
  }

  const deletePlanButton = event.target.closest(".delete-plan");
  if (deletePlanButton) {
    if (!requireActiveMember("delete plans")) {
      return;
    }
    const planId = Number(deletePlanButton.dataset.id);
    const plan = state.plans.find((item) => item.id === planId);
    if (!plan || plan.author_id !== state.currentUser?.id) {
      setStatus("You can only delete your own plans.");
      return;
    }

    const { error } = await supabaseClient.from("plans").delete().eq("id", planId);
    if (error) {
      setStatus(error.message);
      return;
    }

    await refreshAndRender();
    setStatus("Your plan was deleted.");
    return;
  }

  const deleteReplyButton = event.target.closest(".delete-reply");
  if (deleteReplyButton) {
    if (!requireActiveMember("delete replies")) {
      return;
    }
    const replyId = Number(deleteReplyButton.dataset.id);
    const reply = state.replies.find((item) => item.id === replyId);
    if (!reply || reply.author_id !== state.currentUser?.id) {
      setStatus("You can only delete your own replies.");
      return;
    }

    const { error } = await supabaseClient.from("forum_replies").delete().eq("id", replyId);
    if (error) {
      setStatus(error.message);
      return;
    }

    await refreshAndRender();
    setStatus("Your reply was deleted.");
    return;
  }

  const deleteAlbumButton = event.target.closest(".delete-album-item");
  if (deleteAlbumButton) {
    if (!state.currentProfile?.is_admin) {
      setStatus("Only admin accounts can remove album photos.");
      return;
    }

    const albumId = Number(deleteAlbumButton.dataset.id);
    const albumItem = state.albumItems.find((item) => item.id === albumId);
    if (!albumItem) {
      setStatus("That album photo could not be found.");
      return;
    }

    if (albumItem.storage_path) {
      const storageDelete = await supabaseClient.storage.from("album-photos").remove([albumItem.storage_path]);
      if (storageDelete.error) {
        setStatus(storageDelete.error.message);
        return;
      }
    }

    const { error } = await supabaseClient.from("album_items").delete().eq("id", albumId);
    if (error) {
      setStatus(error.message);
      return;
    }

    await refreshAndRender();
    setStatus("Album photo removed.");
    return;
  }

  const registerEventButton = event.target.closest(".register-event");
  if (registerEventButton) {
    if (!state.currentUser) {
      setStatus("Sign in before registering for an event.");
      return;
    }
    if (!requireActiveMember("register for events")) {
      return;
    }

    const eventId = Number(registerEventButton.dataset.id);
    const eventItem = state.events.find((item) => item.id === eventId);
    if (!eventItem) {
      setStatus("That event could not be found.");
      return;
    }

    const existing = state.eventRegistrations.find((registration) => registration.event_id === eventId && registration.profile_id === state.currentUser.id);
    if (existing) {
      setStatus("You are already registered for this event.");
      return;
    }

    const count = state.eventRegistrations.filter((registration) => registration.event_id === eventId).length;
    if (eventItem.capacity && count >= eventItem.capacity) {
      setStatus("That event is already full.");
      return;
    }

    const { error } = await supabaseClient.from("event_registrations").insert({
      event_id: eventId,
      profile_id: state.currentUser.id,
      email: state.currentUser.email || state.currentProfile?.email || null
    });
    if (error) {
      setStatus(error.message);
      return;
    }

    await refreshAndRender();
    setStatus("You are registered for that event.");
    return;
  }

  const updateFundraiserButton = event.target.closest(".update-fundraiser");
  if (updateFundraiserButton) {
    if (!state.currentProfile?.is_admin) {
      setStatus("Only admin accounts can update fundraiser progress.");
      return;
    }

    const fundraiserId = Number(updateFundraiserButton.dataset.id);
    const fundraiser = state.fundraisers.find((item) => item.id === fundraiserId);
    if (!fundraiser) {
      setStatus("That fundraiser could not be found.");
      return;
    }

    const nextAmount = window.prompt(`Enter the new amount raised for "${fundraiser.title}".`, String(fundraiser.current_amount || 0));
    if (nextAmount === null) {
      return;
    }

    const parsed = Number(nextAmount);
    if (Number.isNaN(parsed) || parsed < 0) {
      setStatus("Enter a valid dollar amount.");
      return;
    }

    const { error } = await supabaseClient
      .from("fundraisers")
      .update({ current_amount: parsed })
      .eq("id", fundraiserId);
    if (error) {
      setStatus(error.message);
      return;
    }

    await refreshAndRender();
    setStatus("Fundraiser progress updated.");
    return;
  }

  const setTagButton = event.target.closest(".set-tag");
  if (setTagButton) {
    if (!state.currentProfile?.is_admin) {
      setStatus("Only admin accounts can manage tags.");
      return;
    }
    const profileId = setTagButton.dataset.id;
    const tag = window.prompt("Set a member flair tag. Examples: OG Member, President, Vice-President, Secretary, Treasurer, VIP", "");
    if (tag === null) {
      return;
    }
    const { error } = await supabaseClient.from("profiles").update({ profile_tag: tag.trim() || null }).eq("id", profileId);
    if (error) {
      setStatus(error.message);
      return;
    }
    await refreshAndRender();
    setStatus("User flair updated.");
    return;
  }

  const tempBanButton = event.target.closest(".temp-ban");
  if (tempBanButton) {
    if (!state.currentProfile?.is_admin) {
      setStatus("Only admin accounts can issue bans.");
      return;
    }
    const profileId = tempBanButton.dataset.id;
    const days = Number(tempBanButton.dataset.days);
    const reason = window.prompt("Why is this user being banned?", "Violation of class portal rules");
    if (reason === null) {
      return;
    }
    const hours = days === 0 ? 1 : days * 24;
    const bannedUntil = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
    const { error } = await supabaseClient.from("profiles").update({
      banned_until: bannedUntil,
      ban_reason: reason.trim() || "Violation of class portal rules"
    }).eq("id", profileId);
    if (error) {
      setStatus(error.message);
      return;
    }
    await refreshAndRender();
    setStatus("User ban updated.");
    return;
  }

  const unbanButton = event.target.closest("[data-unban-id]");
  if (unbanButton) {
    if (!state.currentProfile?.is_admin) {
      setStatus("Only admin accounts can remove bans.");
      return;
    }
    const profileId = unbanButton.dataset.unbanId;
    const { error } = await supabaseClient.from("profiles").update({
      banned_until: null,
      ban_reason: null
    }).eq("id", profileId);
    if (error) {
      setStatus(error.message);
      return;
    }
    await refreshAndRender();
    setStatus("User unbanned.");
  }
});

document.addEventListener("submit", async (event) => {
  const replyForm = event.target.closest(".reply-form-inline");
  if (replyForm && !replyForm.classList.contains("report-form")) {
    event.preventDefault();
    if (!state.currentUser) {
      setStatus("Sign in before replying in Tiger Talk.");
      return;
    }
    if (!requireActiveMember("reply in Tiger Talk")) {
      return;
    }

    const postId = Number(replyForm.dataset.replyForm);
    const textarea = replyForm.querySelector("textarea[name='reply']");
    const replyBody = textarea.value.trim();
    if (!replyBody) {
      setStatus("Write a reply before posting.");
      return;
    }

    const { error } = await supabaseClient.from("forum_replies").insert({
      post_id: postId,
      author_id: state.currentUser.id,
      body: replyBody
    });

    if (error) {
      setStatus(error.message);
      return;
    }

    await refreshAndRender();
    setStatus("Reply posted.");
    return;
  }

  const reportForm = event.target.closest(".report-form");
  if (!reportForm) {
    return;
  }

  event.preventDefault();
  if (!state.currentUser) {
    setStatus("Sign in before reporting a post.");
    return;
  }
  if (!requireActiveMember("report posts")) {
    return;
  }

  const postId = Number(reportForm.dataset.reportForm);
  const reason = reportForm.querySelector("textarea[name='reason']").value.trim();
  const currentPost = state.forumPosts.find((post) => post.id === postId);
  if (!reason) {
    setStatus("Please add a reason for the report.");
    return;
  }

  const { error } = await supabaseClient.from("reports").insert({
    post_id: postId,
    title: `Reported thread: ${currentPost?.title || "Forum post"}`,
    reason,
    reported_by: state.currentUser.id,
    status: "open"
  });

  if (error) {
    setStatus(error.message);
    return;
  }

  await refreshAndRender();
  setStatus("Report submitted to the admin team.");
});

window.portalDebug = { state, refreshAndRender };

supabaseClient.auth.onAuthStateChange(() => {
  window.setTimeout(() => {
    refreshAndRender();
  }, 0);
});

(async function init() {
  await refreshAndRender();
  if (!graduationTimerStarted) {
    window.setInterval(updateGraduationCountdown, 1000);
    graduationTimerStarted = true;
  }
})();



