import {
  ANALYTICS_CONSENT_STATE,
  ANALYTICS_ELIGIBILITY,
  resolveAnalyticsEligibility,
} from "../analytics/eligibility.js";
import {
  getPrivacyCenterMessage,
  getPrivacyCenterMessageCatalog,
} from "../i18n/messageCatalog.js";

export const PRIVACY_CATEGORIES = Object.freeze({
  STRICTLY_NECESSARY: "STRICTLY_NECESSARY",
  PREFERENCES: "PREFERENCES",
  ANALYTICS: "ANALYTICS",
  MARKETING: "MARKETING",
});

export const ANALYTICS_CHOICE_ACTIONS = Object.freeze({
  ALLOW: "ALLOW_ANALYTICS",
  DENY: "DENY_ANALYTICS",
  WITHDRAW: "WITHDRAW_ANALYTICS",
});

const CONSENT_STATE_BY_ACTION = Object.freeze({
  [ANALYTICS_CHOICE_ACTIONS.ALLOW]: ANALYTICS_CONSENT_STATE.ALLOWED,
  [ANALYTICS_CHOICE_ACTIONS.DENY]: ANALYTICS_CONSENT_STATE.DENIED,
  [ANALYTICS_CHOICE_ACTIONS.WITHDRAW]: ANALYTICS_CONSENT_STATE.WITHDRAWN,
});

const CHOICE_MESSAGE_KEY = Object.freeze({
  [ANALYTICS_CONSENT_STATE.ALLOWED]: "privacyCenter.choice.allowed",
  [ANALYTICS_CONSENT_STATE.DENIED]: "privacyCenter.choice.denied",
  [ANALYTICS_CONSENT_STATE.WITHDRAWN]: "privacyCenter.choice.withdrawn",
});

function freezeCategory(category) {
  return Object.freeze({
    ...category,
    actions: category.actions ? Object.freeze(category.actions.map((action) => Object.freeze(action))) : undefined,
  });
}

export function applyAnalyticsChoice(privacyState = {}, action) {
  const consentState = CONSENT_STATE_BY_ACTION[action];
  if (!consentState) {
    return Object.freeze({ ok: false, reason: "UNSUPPORTED_ANALYTICS_CHOICE", privacyState });
  }

  return Object.freeze({
    ok: true,
    privacyState: Object.freeze({
      ...privacyState,
      consentState,
    }),
  });
}

export function describeAnalyticsEffectiveState(privacyState, locale = "ko-KR") {
  const eligibility = resolveAnalyticsEligibility(privacyState);
  const messageKey = eligibility === ANALYTICS_ELIGIBILITY.ELIGIBLE
    ? "privacyCenter.effective.eligible"
    : "privacyCenter.effective.suppressed";

  return Object.freeze({
    eligibility,
    messageKey,
    message: getPrivacyCenterMessage(locale, messageKey),
  });
}

export function createPrivacyCenterViewModel({ locale = "ko-KR", privacyState = {} } = {}) {
  const catalog = getPrivacyCenterMessageCatalog(locale);
  const effectiveState = describeAnalyticsEffectiveState(privacyState, locale);
  const choiceKey = CHOICE_MESSAGE_KEY[privacyState.consentState]
    || "privacyCenter.choice.unresolved";
  const currentChoice = getPrivacyCenterMessage(locale, choiceKey);

  const categories = [
    freezeCategory({
      id: PRIVACY_CATEGORIES.STRICTLY_NECESSARY,
      titleMessageKey: "privacyCenter.necessary.title",
      descriptionMessageKey: "privacyCenter.necessary.description",
      status: "REQUIRED_FOR_CORE_SERVICE",
      statusMessageKey: "privacyCenter.necessary.required",
      userControl: "NOT_OPTIONAL",
      implementationState: "CORE_SERVICE_BOUNDARY_ONLY",
      eligibilityMeaning: "DOES_NOT_INCLUDE_ANALYTICS",
    }),
    freezeCategory({
      id: PRIVACY_CATEGORIES.PREFERENCES,
      titleMessageKey: "privacyCenter.preferences.title",
      descriptionMessageKey: "privacyCenter.preferences.description",
      status: "NOT_IMPLEMENTED",
      statusMessageKey: "privacyCenter.preferences.notImplemented",
      userControl: "FUTURE_CONTROL",
      implementationState: "PERSISTENCE_NOT_IMPLEMENTED",
      eligibilityMeaning: "DOES_NOT_ENABLE_ANALYTICS",
    }),
    freezeCategory({
      id: PRIVACY_CATEGORIES.ANALYTICS,
      titleMessageKey: "privacyCenter.analytics.title",
      descriptionMessageKey: "privacyCenter.analytics.description",
      status: privacyState.consentState || ANALYTICS_CONSENT_STATE.UNRESOLVED,
      statusMessageKey: choiceKey,
      userControl: "OPTIONAL",
      implementationState: "VIEW_MODEL_FOUNDATION_ONLY",
      eligibilityMeaning: effectiveState.eligibility,
      actions: [
        { id: ANALYTICS_CHOICE_ACTIONS.ALLOW, messageKey: "privacyCenter.analytics.allow", emphasis: "EQUAL" },
        { id: ANALYTICS_CHOICE_ACTIONS.DENY, messageKey: "privacyCenter.analytics.deny", emphasis: "EQUAL" },
        { id: ANALYTICS_CHOICE_ACTIONS.WITHDRAW, messageKey: "privacyCenter.analytics.withdraw", emphasis: "STANDARD" },
      ],
    }),
    freezeCategory({
      id: PRIVACY_CATEGORIES.MARKETING,
      titleMessageKey: "privacyCenter.marketing.title",
      descriptionMessageKey: "privacyCenter.marketing.description",
      status: "NOT_IN_USE",
      statusMessageKey: "privacyCenter.marketing.notInUse",
      userControl: "NOT_AVAILABLE",
      implementationState: "NOT_AUTHORIZED",
      eligibilityMeaning: "DOES_NOT_ENABLE_ANALYTICS",
    }),
  ];

  return Object.freeze({
    locale,
    dialogTitleMessageKey: "privacyCenter.title",
    dialogTitle: catalog["privacyCenter.title"],
    dialogDescriptionMessageKey: "privacyCenter.description",
    dialogDescription: catalog["privacyCenter.description"],
    closeActionMessageKey: "privacyCenter.close",
    closeActionLabel: catalog["privacyCenter.close"],
    currentChoice,
    currentChoiceMessage: getPrivacyCenterMessage(locale, "privacyCenter.currentChoice", { choice: currentChoice }),
    effectiveState,
    effectiveStateMessage: getPrivacyCenterMessage(locale, "privacyCenter.effectiveState", { state: effectiveState.message }),
    persistence: "MEMORY_ONLY_RUNTIME_NOT_DURABLE",
    publicMount: false,
    categories: Object.freeze(categories),
  });
}
