import { Dictionary } from "./index";

export class FieldParser {
	#props: Dictionary;
	constructor(props: Dictionary) {
		this.#props = props;
	}
	parseField(name: string, value: any) {
		if (this.#props) {
			if (this.#props[name]?.type !== "string") {
				try {
					return JSON.parse(value);
				} catch {
					void 0;
				}
			}
		}
		return value;
	}
}