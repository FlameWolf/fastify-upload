import { Dictionary, FieldParser } from "./index";

export class FieldParserNoSchema implements FieldParser {
	parseField(name: string, value: any) {
		return value;
	}
}