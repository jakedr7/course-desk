/**
 * The Moodle site new visitors see pre-filled on the connect screen.
 * Change it to your own school when you deploy your copy, or set it to "" for none.
 * A shared link like https://your-site/?site=moodle.myschool.edu overrides it.
 */
export const DEFAULT_SITE = "myelearning.sta.uwi.edu";

/** Where the website version lives. Invite links from the phone app point here. */
export const PUBLIC_URL = "https://jakedr7.github.io/course-desk/";

/** True inside the installed Android/iOS app. */
export const NATIVE = typeof window !== "undefined" && !!(window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.();

/** Set by the sample-data-only preview build, which can't reach any Moodle site. */
export const PREVIEW = typeof window !== "undefined" && (window as unknown as { COURSE_DESK_PREVIEW?: boolean }).COURSE_DESK_PREVIEW === true;
