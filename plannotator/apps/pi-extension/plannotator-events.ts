import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import type { DiffType, VcsSelection } from "./server.js";
import { getRecentAssistantMessages } from "./assistant-message.js";
import {
	getLastAssistantMessageText,
	getStartupErrorMessage,
	openArchiveBrowserAction,
	openCodeReview,
	openLastMessageAnnotation,
	openMarkdownAnnotation,
	startCodeReviewBrowserSession,
	startLastMessageAnnotationSession,
	startMarkdownAnnotationSession,
	startPlanReviewBrowserSession,
} from "./sureagents-browser.js";

export const SUREAGENTS_REQUEST_CHANNEL = "sureagents:request" as const;
export const SUREAGENTS_REVIEW_RESULT_CHANNEL = "sureagents:review-result" as const;
export const SUREAGENTS_TIMEOUT_MS = 5_000;

export type SureAgentsAction =
	| "plan-mode"
	| "plan-review"
	| "review-status"
	| "code-review"
	| "annotate"
	| "annotate-last"
	| "archive";

export interface SureAgentsHandledResponse<T> {
	status: "handled";
	result: T;
}

export interface SureAgentsUnavailableResponse {
	status: "unavailable";
	error?: string;
}

export interface SureAgentsErrorResponse {
	status: "error";
	error: string;
}

export type SureAgentsResponse<T> =
	| SureAgentsHandledResponse<T>
	| SureAgentsUnavailableResponse
	| SureAgentsErrorResponse;

export interface SureAgentsRequestBase<A extends SureAgentsAction, P, R> {
	requestId: string;
	action: A;
	payload: P;
	respond: (response: SureAgentsResponse<R>) => void;
}

export interface SureAgentsPlanModePayload {
	mode?: "enter" | "exit" | "toggle" | "status";
}

export interface SureAgentsPlanModeResult {
	phase: "idle" | "planning" | "executing";
}

export interface SureAgentsPlanReviewPayload {
	planFilePath?: string;
	planContent: string;
	origin?: string;
}

export interface SureAgentsPlanReviewStartResult {
	status: "pending";
	reviewId: string;
}

export interface SureAgentsReviewResultEvent {
	reviewId: string;
	approved: boolean;
	feedback?: string;
	savedPath?: string;
	agentSwitch?: string;
	permissionMode?: string;
}

export interface SureAgentsReviewStatusPayload {
	reviewId: string;
}

export type SureAgentsReviewStatusResult =
	| { status: "pending" }
	| ({ status: "completed" } & SureAgentsReviewResultEvent)
	| { status: "missing" };

export interface SureAgentsCodeReviewPayload {
	diffType?: DiffType;
	defaultBranch?: string;
	vcsType?: VcsSelection;
	useLocal?: boolean;
	cwd?: string;
	prUrl?: string;
}

export interface SureAgentsCodeReviewResult {
	approved: boolean;
	feedback?: string;
	annotations?: unknown[];
	agentSwitch?: string;
}

export interface SureAgentsAnnotatePayload {
	filePath: string;
	markdown?: string;
	mode?: "annotate" | "annotate-folder" | "annotate-last";
	folderPath?: string;
	/** Enable review-gate UX (Approve / Annotate / Close). */
	gate?: boolean;
}

export interface SureAgentsAnnotationResult {
	feedback: string;
	/** True when the reviewer closed the session without providing feedback. */
	exit?: boolean;
	/** True when the reviewer clicked Approve in review-gate mode. */
	approved?: boolean;
}

export interface SureAgentsArchivePayload {
	customPlanPath?: string;
}

export interface SureAgentsArchiveResult {
	opened: boolean;
}

export type SureAgentsRequestMap = {
	"plan-mode": SureAgentsRequestBase<"plan-mode", SureAgentsPlanModePayload, SureAgentsPlanModeResult>;
	"plan-review": SureAgentsRequestBase<"plan-review", SureAgentsPlanReviewPayload, SureAgentsPlanReviewStartResult>;
	"review-status": SureAgentsRequestBase<"review-status", SureAgentsReviewStatusPayload, SureAgentsReviewStatusResult>;
	"code-review": SureAgentsRequestBase<"code-review", SureAgentsCodeReviewPayload, SureAgentsCodeReviewResult>;
	annotate: SureAgentsRequestBase<"annotate", SureAgentsAnnotatePayload, SureAgentsAnnotationResult>;
	"annotate-last": SureAgentsRequestBase<"annotate-last", SureAgentsAnnotatePayload, SureAgentsAnnotationResult>;
	archive: SureAgentsRequestBase<"archive", SureAgentsArchivePayload, SureAgentsArchiveResult>;
};
export type SureAgentsRequest = SureAgentsRequestMap[SureAgentsAction];
export type SureAgentsResponseMap = {
	"plan-mode": SureAgentsResponse<SureAgentsPlanModeResult>;
	"plan-review": SureAgentsResponse<SureAgentsPlanReviewStartResult>;
	"review-status": SureAgentsResponse<SureAgentsReviewStatusResult>;
	"code-review": SureAgentsResponse<SureAgentsCodeReviewResult>;
	annotate: SureAgentsResponse<SureAgentsAnnotationResult>;
	"annotate-last": SureAgentsResponse<SureAgentsAnnotationResult>;
	archive: SureAgentsResponse<SureAgentsArchiveResult>;
};
function isSureAgentsAction(value: unknown): value is SureAgentsAction {
	return (
		value === "plan-mode" ||
		value === "plan-review" ||
		value === "review-status" ||
		value === "code-review" ||
		value === "annotate" ||
		value === "annotate-last" ||
		value === "archive"
	);
}

const REVIEW_STATUS_PATH = join(homedir(), ".pi", "sureagents-review-status.json");

type StoredReviewStatus = Record<string, SureAgentsReviewStatusResult>;

function readStoredReviewStatuses(): StoredReviewStatus {
	try {
		if (!existsSync(REVIEW_STATUS_PATH)) return {};
		const raw = readFileSync(REVIEW_STATUS_PATH, "utf-8");
		const parsed = JSON.parse(raw) as StoredReviewStatus;
		return parsed && typeof parsed === "object" ? parsed : {};
	} catch {
		return {};
	}
}

function writeStoredReviewStatuses(statuses: StoredReviewStatus): void {
	mkdirSync(dirname(REVIEW_STATUS_PATH), { recursive: true });
	writeFileSync(REVIEW_STATUS_PATH, JSON.stringify(statuses, null, 2));
}

function setStoredReviewStatus(reviewId: string, status: SureAgentsReviewStatusResult): void {
	const statuses = readStoredReviewStatuses();
	statuses[reviewId] = status;
	writeStoredReviewStatuses(statuses);
}

function getStoredReviewStatus(reviewId: string): SureAgentsReviewStatusResult {
	return readStoredReviewStatuses()[reviewId] ?? { status: "missing" };
}

function createActiveSessionContext() {
	let currentCtx: ExtensionContext | undefined;

	return {
		set(ctx: ExtensionContext): void {
			currentCtx = ctx;
		},
		clear(): void {
			currentCtx = undefined;
		},
		get(): ExtensionContext | undefined {
			return currentCtx;
		},
	};
}

export interface SureAgentsEventListenerOptions {
	handlePlanMode?: (
		mode: NonNullable<SureAgentsPlanModePayload["mode"]>,
		ctx: ExtensionContext,
	) => Promise<SureAgentsPlanModeResult> | SureAgentsPlanModeResult;
}

export function registerSureAgentsEventListeners(
	pi: ExtensionAPI,
	options: SureAgentsEventListenerOptions = {},
): void {
	const activeSessionContext = createActiveSessionContext();

	// SureAgents event requests are handled against the latest active session.
	// The active context is intentionally session-scoped and replaced on each session_start.
	pi.on("session_start", async (_event, ctx) => {
		activeSessionContext.set(ctx);
	});
	pi.events.on(SUREAGENTS_REQUEST_CHANNEL, async (data) => {
		const request = data as Partial<SureAgentsRequest> | null;
		const ctx = activeSessionContext.get();

		if (!request || typeof request.respond !== "function" || !isSureAgentsAction(request.action)) {
			return;
		}

		try {
			if (request.action === "review-status") {
				const reviewId = request.payload?.reviewId;
				if (typeof reviewId !== "string" || !reviewId.trim()) {
					request.respond({ status: "error", error: "Missing reviewId for review-status request." });
					return;
				}
				request.respond({ status: "handled", result: getStoredReviewStatus(reviewId) });
				return;
			}

			if (!ctx) {
				request.respond({ status: "unavailable", error: "SureAgents context is not ready yet." });
				return;
			}

			switch (request.action) {
				case "plan-mode": {
					if (!options.handlePlanMode) {
						request.respond({ status: "unavailable", error: "Plan mode control is not available in this session." });
						return;
					}
					const mode = request.payload?.mode ?? "toggle";
					if (mode !== "enter" && mode !== "exit" && mode !== "toggle" && mode !== "status") {
						request.respond({ status: "error", error: "Invalid plan-mode payload.mode." });
						return;
					}
					const result = await options.handlePlanMode(mode, ctx);
					request.respond({ status: "handled", result });
					return;
				}
				case "plan-review": {
					const planContent = request.payload?.planContent;
					if (typeof planContent !== "string" || !planContent.trim()) {
						request.respond({ status: "error", error: "Missing planContent for plan-review request." });
						return;
					}
					const session = await startPlanReviewBrowserSession(ctx, planContent);
					setStoredReviewStatus(session.reviewId, { status: "pending" });
					session.onDecision((result) => {
						const reviewResult = {
							reviewId: session.reviewId,
							approved: result.approved,
							feedback: result.feedback,
							savedPath: result.savedPath,
							agentSwitch: result.agentSwitch,
							permissionMode: result.permissionMode,
						} satisfies SureAgentsReviewResultEvent;
						setStoredReviewStatus(session.reviewId, { status: "completed", ...reviewResult });
						pi.events.emit(SUREAGENTS_REVIEW_RESULT_CHANNEL, reviewResult);
					});
					request.respond({
						status: "handled",
						result: {
							status: "pending",
							reviewId: session.reviewId,
						},
					});
					return;
				}
				case "code-review": {
					const result = await openCodeReview(ctx, {
						cwd: request.payload?.cwd,
						defaultBranch: request.payload?.defaultBranch,
						diffType: request.payload?.diffType,
						vcsType: request.payload?.vcsType,
						useLocal: request.payload?.useLocal,
						prUrl: request.payload?.prUrl,
					});
					request.respond({ status: "handled", result });
					return;
				}
				case "annotate": {
					const payload = request.payload;
					if (!payload?.filePath) {
						request.respond({ status: "error", error: "Missing filePath for annotate request." });
						return;
					}
					const sourceConverted = /\.html?$/i.test(payload.filePath) || /^https?:\/\//i.test(payload.filePath);
					const result = await openMarkdownAnnotation(
						ctx,
						payload.filePath,
						payload.markdown ?? "",
						payload.mode ?? "annotate",
						payload.folderPath,
						undefined,
						sourceConverted,
						payload.gate,
					);
					request.respond({ status: "handled", result });
					return;
				}
				case "annotate-last": {
					const payload = request.payload;
					const usePayloadText = !!payload?.markdown?.trim();
					const lastText = usePayloadText ? payload!.markdown! : getLastAssistantMessageText(ctx);
					if (!lastText) {
						request.respond({ status: "unavailable", error: "No assistant message found in session." });
						return;
					}
					const recent = usePayloadText ? [] : getRecentAssistantMessages(ctx, 25);
					const pickerMessages = recent.length > 1 ? recent : undefined;
					const result = await openLastMessageAnnotation(ctx, lastText, payload?.gate, pickerMessages);
					request.respond({ status: "handled", result });
					return;
				}
				case "archive": {
					const result = await openArchiveBrowserAction(ctx, request.payload?.customPlanPath);
					request.respond({ status: "handled", result });
					return;
				}
			}
		} catch (err) {
			const message = getStartupErrorMessage(err);
			if (/unavailable|not available/i.test(message)) {
				request.respond({ status: "unavailable", error: message });
				return;
			}
			request.respond({ status: "error", error: message });
		}
	});
}

export {
	getLastAssistantMessageText,
	hasPlanBrowserHtml,
	hasReviewBrowserHtml,
	startCodeReviewBrowserSession,
	startLastMessageAnnotationSession,
	startMarkdownAnnotationSession,
	getStartupErrorMessage,
	openArchiveBrowserAction,
	openCodeReview,
	openLastMessageAnnotation,
	openMarkdownAnnotation,
	openPlanReviewBrowser,
	startPlanReviewBrowserSession,
} from "./sureagents-browser.js";
