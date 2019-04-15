import * as ts from 'typescript';
import { createInlineProgram } from './program';

export const inspectObjectCore = <T extends Record<string, string>>(
    preamble: string,
    typeMap: T
) => {
    const code = [`${preamble};`]
        .concat(Object.entries(typeMap).map(([k, d]) => `type ${k} = ${d};`))
        .join(' ');
    const { program, inlineSourceFile } = createInlineProgram(code);
    const checker = program.getTypeChecker();

    const pairs = checker
        .getSymbolsInScope(
            inlineSourceFile!.endOfFileToken,
            ts.SymbolFlags.Type
        )
        .filter(symbol => Object.keys(typeMap).includes(symbol.name))
        .map(symbol => {
            const symbolType = checker.getDeclaredTypeOfSymbol(symbol);
            const type = checker.typeToString(
                symbolType,
                inlineSourceFile,
                ts.TypeFormatFlags.InTypeAlias
            );
            return [symbol.name, type];
        });

    const types = pairs.reduce(
        (acc, [k, v]) => {
            acc[k] = v;
            return acc;
        },
        {} as { [K in keyof T]: string }
    );

    const diagnostics = [
        ...program.getSyntacticDiagnostics(inlineSourceFile),
        ...program.getSemanticDiagnostics(inlineSourceFile),
        ...program.getDeclarationDiagnostics(inlineSourceFile),
    ];

    if (diagnostics.length > 0) {
        throw diagnostics;
    }

    return types;
};

export const inspectCore = (preamble: string, type: string) =>
    inspectObjectCore(preamble, { x: type }).x;

export const inspectObjectWithPreamble = <T extends Record<string, string>>(
    preamble: string
) => (typeMap: T) => inspectObjectCore(preamble, typeMap);
export const inspectWithPreamble = (preamble: string) => (type: string) =>
    inspectCore(preamble, type);

export const inspectObject = inspectObjectWithPreamble('');
export const inspect = inspectWithPreamble('');
