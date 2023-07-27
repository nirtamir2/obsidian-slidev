import { useContext } from "react";
import { CurrentSlideNumberContext } from "./CurrentSlideNumberContext";

export const useCurrentSlideNumber = (): number => {
	return useContext(CurrentSlideNumberContext);
};
