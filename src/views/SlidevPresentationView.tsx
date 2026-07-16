import type { IconName, WorkspaceLeaf } from "obsidian";
import { ItemView } from "obsidian";
import { createRoot, onCleanup } from "solid-js";
import type { SetStoreFunction } from "solid-js/store";
import { createStore, reconcile } from "solid-js/store";
import { insert } from "solid-js/web";
import type { SlidevPluginSettings } from "../settings";
import type { SlidevSetupController } from "../setup/SlidevSetupController";
import { AppContext } from "./AppContext";
import { PresentationView } from "./PresentationView";
import { SettingsContext } from "./SettingsContext";
import type { SlidevStore } from "./SlidevStoreContext";
import { SlidevStoreContext } from "./SlidevStoreContext";

export const SLIDEV_PRESENTATION_VIEW_TYPE = "slidev-presentation-view";

export class SlidevPresentationView extends ItemView {
  settings: SlidevPluginSettings;
  setSlidevStore: SetStoreFunction<SlidevStore> = () => {
    return -1;
  };

  #dispose: (() => void) | undefined;
  #setSettings: SetStoreFunction<SlidevPluginSettings> | undefined;
  readonly #setupController: SlidevSetupController;

  override getIcon(): IconName {
    return "presentation";
  }
  constructor(
    leaf: WorkspaceLeaf,
    settings: SlidevPluginSettings,
    setupController: SlidevSetupController,
  ) {
    super(leaf);
    this.settings = { ...settings };
    this.#setupController = setupController;
  }

  updateSettings(settings: SlidevPluginSettings) {
    this.settings = { ...settings };
    this.#setSettings?.(reconcile(this.settings));
  }

  onChangeLine(currentSlideNumber: number) {
    this.setSlidevStore("currentSlideNumber", currentSlideNumber);
  }

  getViewType() {
    return SLIDEV_PRESENTATION_VIEW_TYPE;
  }

  getDisplayText() {
    return "Slidev presentation view";
  }

  override async onOpen() {
    const [settings, setSettings] = createStore<SlidevPluginSettings>({
      ...this.settings,
    });
    this.#setSettings = setSettings;

    const [slidevStore, setSlidevStore] = createStore<SlidevStore>({
      currentSlideNumber: 1,
    });
    this.setSlidevStore = setSlidevStore;

    this.#dispose = createRoot((dispose) => {
      if (this.containerEl.children[1] == null) {
        throw new Error("SlidevPresentationView root not found");
      }

      const element = this.containerEl.children[1];
      insert(
        element,
        <AppContext.Provider value={this.app}>
          <SettingsContext.Provider value={settings}>
            <SlidevStoreContext.Provider value={slidevStore}>
              <PresentationView setupController={this.#setupController} />
            </SlidevStoreContext.Provider>
          </SettingsContext.Provider>
        </AppContext.Provider>,
      );
      onCleanup(() => {
        element.empty();
      });
      return dispose;
    });
  }

  override async onClose() {
    this.#dispose?.();
    this.#dispose = undefined;
    this.#setSettings = undefined;
  }
}
