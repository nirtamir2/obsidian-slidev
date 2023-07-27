import { useContext } from "react";
import { CurrentSlideNumberContext } from "./CurrentSlideNumberContext";

export const useCurrentSlideNumber = (): number => {
	const value = useContext(CurrentSlideNumberContext);
	if (value == null) {
		throw new Error(
			"useCurrentSlideNumber - context CurrentSlideNumber is not initialized",
		);
	}
	return value;
};
