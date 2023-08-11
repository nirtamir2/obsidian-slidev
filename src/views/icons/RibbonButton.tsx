import { JSXElement } from "solid-js";

export function RibbonButton(props: {
	onClick: () => void;
	label: string;
	children: JSXElement;
}) {
	return (
		<button
			type="button"
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
		</button>
	);
}
