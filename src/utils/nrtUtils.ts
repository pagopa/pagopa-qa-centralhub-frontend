import type { FlakyScenario, TestExecution, TestRun, TestSuite } from "@/types";
import {
    NRT_ALLURE_REPORT_BASE_URL,
    NRT_REVISION_RESULT_BACKGROUND_COLORS,
    type TicketStatusStyle,
} from "./nrtsCostants";

export function calculatePassRate(testRun?: TestRun | null): number {
    if (!testRun?.scenario_qty) return 0;
    return ((testRun.passed_scenario ?? 0) / testRun.scenario_qty) * 100;
}

export function calculatePassRateColor(passRate: number): string {
    if (passRate >= 80) return "text-green-500";
    if (passRate >= 50) return "text-yellow-500";
    if (passRate < 50) return "text-red-500";
    return "";
}

export function getRevisionResultBackgroundColor(revisionResult: string): string {
    return NRT_REVISION_RESULT_BACKGROUND_COLORS[revisionResult] ?? "transparent";
}

export function isFlakyScenarioEqual(
    scenarioA: FlakyScenario,
    scenarioB: FlakyScenario,
): boolean {
    return (
        scenarioA.suite_id === scenarioB.suite_id &&
        scenarioA.test_object === scenarioB.test_object &&
        scenarioA.scenario_name === scenarioB.scenario_name &&
        scenarioA.suite_version === scenarioB.suite_version &&
        scenarioA.test_version === scenarioB.test_version
    );
}

export function createFlakyScenario(
    scenario: TestExecution,
    suite: TestSuite,
    testVersion: string | null | undefined,
): FlakyScenario {
    return {
        suite_id: suite.id,
        test_object: suite.test_object,
        scenario_name: scenario.scenario_name ?? "",
        suite_version: suite.suite_version,
        test_version: testVersion ?? "",
        inserted_at: null,
        is_flaky: true,
    };
}

export function isScenarioInFlakyScenarios(
    scenario: TestExecution,
    suite: TestSuite,
    testVersion: string | null | undefined,
    flakyScenarios: FlakyScenario[],
): boolean {
    const candidate = createFlakyScenario(scenario, suite, testVersion);
    return flakyScenarios.some((flakyScenario) =>
        isFlakyScenarioEqual(flakyScenario, candidate) && flakyScenario.is_flaky === true,
    );
}

export function formatNrtTimestamp(value: string | null | undefined): string | null {
    return value ? new Date(value).toLocaleString("it-IT") : null;
}

export function buildAllureRunUrl(testRun: TestRun, testObject: string): string {
    const timestamp = testRun.timestamp_start?.replace("T", " ").replace(" ", "_");
    return `${NRT_ALLURE_REPORT_BASE_URL}/${testObject}-test/${timestamp}/index.html`;
}

export function buildAiAnalysisUrl(testRun: TestRun, testObject: string): string {
    const timestamp = testRun.timestamp_start?.replace("T", " ").replace(" ", "_");
    return `${NRT_ALLURE_REPORT_BASE_URL}/${testObject}-test/${timestamp}/analysis/index.html`;
}

export function buildAllureScenarioUrl(testRun: TestRun, testObject: string, scenarioAllureId: string): string {
    if (testRun.allure_url == null){
        const timestamp = testRun.timestamp_start?.replace("T", " ").replace(" ", "_");
        return `${NRT_ALLURE_REPORT_BASE_URL}/${testObject}-test/${timestamp}/index.html#suites/${scenarioAllureId}`;
    }
    
    return `${testRun.allure_url}#suites/${scenarioAllureId}`;
}
