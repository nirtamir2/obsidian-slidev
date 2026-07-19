import type {
  SlidevSetupInput,
  SlidevSetupResult,
  SlidevSetupState,
} from "./SlidevSetupService";

interface SetupService {
  cancel(): Promise<void>;
  getState(): SlidevSetupState;
  setup(input: SlidevSetupInput): Promise<SlidevSetupResult>;
  subscribe(listener: (state: SlidevSetupState) => void): () => void;
}

interface SlidevSetupControllerOptions {
  createInput: () => SlidevSetupInput;
  persistProjectPath: (projectPath: string) => Promise<void>;
  service: SetupService;
}

export class SlidevSetupController {
  private activeSetup: Promise<SlidevSetupResult> | null = null;
  private readonly createInput: () => SlidevSetupInput;
  private readonly listeners = new Set<(state: SlidevSetupState) => void>();
  private readonly persistProjectPath: (projectPath: string) => Promise<void>;
  private readonly service: SetupService;
  private state: SlidevSetupState;
  private readonly unsubscribeService: () => void;

  constructor({
    createInput,
    persistProjectPath,
    service,
  }: SlidevSetupControllerOptions) {
    this.createInput = createInput;
    this.persistProjectPath = persistProjectPath;
    this.service = service;
    this.state = service.getState();
    this.unsubscribeService = service.subscribe((state) => {
      this.setState(state);
    });
  }

  getState(): SlidevSetupState {
    return { ...this.state, logs: [...this.state.logs] };
  }

  subscribe(listener: (state: SlidevSetupState) => void): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  start(): Promise<SlidevSetupResult> {
    if (this.activeSetup != null) {
      return this.activeSetup;
    }

    const setup = this.runSetup();
    this.activeSetup = setup;
    void setup.finally(() => {
      if (this.activeSetup === setup) {
        this.activeSetup = null;
      }
    });
    return setup;
  }

  async cancel(): Promise<void> {
    await this.service.cancel();
  }

  async dispose(): Promise<void> {
    this.unsubscribeService();
    await this.cancel();
    this.listeners.clear();
  }

  private async runSetup(): Promise<SlidevSetupResult> {
    let input: SlidevSetupInput;
    try {
      input = this.createInput();
    } catch {
      return this.fail(
        "filesystem-error",
        "Slidev quick setup requires a vault stored on the local file system.",
      );
    }

    const result = await this.service.setup(input);
    if (!result.ok) {
      if (this.state.status !== "error") {
        this.setState({
          ...this.state,
          errorCode: result.code,
          message: result.message,
          status: "error",
        });
      }
      return result;
    }

    this.setState({
      ...this.state,
      message: "Saving Slidev settings…",
      status: "running",
    });
    try {
      await this.persistProjectPath(result.projectPath);
    } catch (error) {
      const detail = error instanceof Error ? `: ${error.message}` : ".";
      return this.fail(
        "settings-error",
        `Slidev was installed, but its settings could not be saved${detail}`,
      );
    }

    this.setState({
      logs: [...this.state.logs],
      message: "Slidev is ready.",
      stage: "ready",
      status: "success",
    });
    return result;
  }

  private fail(
    code: "filesystem-error" | "settings-error",
    message: string,
  ): SlidevSetupResult {
    this.setState({
      ...this.state,
      errorCode: code,
      message,
      status: "error",
    });
    return { ok: false, code, message };
  }

  private setState(state: SlidevSetupState) {
    this.state = state;
    for (const listener of this.listeners) {
      listener(this.getState());
    }
  }
}
