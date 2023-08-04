import {
	JSXElement,
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

function RibbonButton(props: {
	onClick: () => void;
	label: string;
	children: JSXElement;
}) {
	return (
		<div
			class="clickable-icon side-dock-ribbon-action slidev-plugin-ribbon-class"
			aria-label={props.label}
			data-tooltip-position="top"
			// eslint-disable-next-line jsx-a11y/aria-props
			aria-label-delay="300"
			onClick={() => {
				props.onClick();
			}}
		>
			{props.children}
		</div>
	);
}

function MonitorPlayIcon() {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width="24"
			height="24"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
			class="lucide lucide-monitor-play"
		>
			<path d="m10 7 5 3-5 3Z" />
			<rect width="20" height="14" x="2" y="3" rx="2" />
			<path d="M12 17v4" />
			<path d="M8 21h8" />
		</svg>
	);
}

function GanttChartSquareIcon() {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width="24"
			height="24"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
			class="lucide lucide-gantt-chart-square"
		>
			<rect width="18" height="18" x="3" y="3" rx="2" />
			<path d="M9 8h7" />
			<path d="M8 12h6" />
			<path d="M11 16h5" />
		</svg>
	);
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
				<div class="flex h-full items-center justify-center">
					Loading slidev slides
				</div>
			}
		>
			<Show
				when={isServerUp()}
				fallback={
					<div class="flex h-full items-center justify-center">
						<div class="flex flex-col items-center gap-4">
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
				<div class="flex h-full flex-col">
					<h4 class="flex items-center gap-2">
						<div class="flex-1">
							{vault.getName()} #{store.currentSlideNumber}
						</div>
						<div class="flex items-center gap-2">
							<RibbonButton
								label="Open presentation view"
								onClick={() => {
									window.open(
										`${serverBaseUrl()}`,
										"noopener=true,noreferrer=true",
									);
								}}
							>
								<MonitorPlayIcon />
							</RibbonButton>
							<RibbonButton
								label="Open presenter view"
								onClick={() => {
									window.open(
										`${serverBaseUrl()}presenter`,
										"noopener=true,noreferrer=true",
									);
								}}
							>
								<GanttChartSquareIcon />
							</RibbonButton>
						</div>
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
