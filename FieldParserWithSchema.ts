import { Dictionary, FieldParser } from "./index";

export class FieldParserWithSchema implements FieldParser {
	private props: Dictionary;
	constructor(props: Dictionary) {
		this.props = props;
	}
	parseField(name: string, value: any) {
		if (this.props[name]?.type !== "string") {
			try {
				return JSON.parse(value);
			} catch {
				void 0;
			}
		}
		return value;
	}
}