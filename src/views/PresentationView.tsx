import {
	Show,
	Suspense,
	createEffect,
	createResource,
	useContext,
} from "solid-js";
import "../styles.css";
import { SlidevStoreContext } from "./SlidevStoreContext";
import { useApp } from "./useApp";
import { useSettings } from "./useSettings";

const localhost = () => "localhost"; //`127.0.0.1`;

async function fetchIsServerUp(serverBaseUrl: string): Promise<boolean> {
	try {
		const response = await fetch(`${serverBaseUrl}index.html`);
		try {
			await response.text();
			return true;
		} catch {
			return false;
		}
	} catch {
		return false;
	}
}

export const PresentationView = () => {
	const { vault } = useApp();
	const config = useSettings();
	const store = useContext(SlidevStoreContext);

	const serverBaseUrl = () => `http://${localhost()}:${config.port}/`;

	const [isServerUp, { refetch }] = createResource(
		serverBaseUrl,
		fetchIsServerUp,
	);

	createEffect(() => {
		// eslint-disable-next-line @typescript-eslint/no-unused-expressions
		store.currentSlideNumber;
		void refetch();
	});

	const iframeSrcUrl = () => {
		return `${serverBaseUrl()}${store.currentSlideNumber}?embedded=true`;
	};

	return (
		<Suspense
			fallback={
				<div class="flex items-center justify-center h-full">
					Loading slidev slides
				</div>
			}
		>
			<Show
				when={isServerUp()}
				fallback={
					<div class="flex items-center justify-center h-full">
						<div class="flex items-center flex-col gap-4">
							<div class="text-xl text-red-400">
								Slidev server is down
							</div>
							<div>
								No server found at{" "}
								{/* eslint-disable-next-line react/forbid-elements */}
								<a href={serverBaseUrl()}>{serverBaseUrl()}</a>
							</div>
							<div>
								Try running <code>slidev slides.md</code>
							</div>
						</div>
					</div>
				}
			>
				<div class="flex flex-col h-full">
					<h4>
						{vault.getName()} #{store.currentSlideNumber}
					</h4>
					{/* eslint-disable-next-line react/iframe-missing-sandbox */}
					<iframe
						sandbox="allow-scripts allow-same-origin"
						title="Slidev presentation"
						class="h-full w-full"
						id="iframe"
						src={iframeSrcUrl()}
					/>
				</div>
			</Show>
		</Suspense>
	);
};
