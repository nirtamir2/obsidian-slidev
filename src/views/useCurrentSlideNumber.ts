import { useContext } from "solid-js";
import { CurrentSlideNumberContext } from "./CurrentSlideNumberContext";

export const useCurrentSlideNumber = (): number => {
	return useContext(CurrentSlideNumberContext);
};
