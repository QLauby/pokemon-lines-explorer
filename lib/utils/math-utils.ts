export const floatToFraction = (val: number, tolerance: number = 1.0E-9): string => {
    if (val === 0) return "0";
    if (Number.isInteger(val)) return val.toString();
    const isNegative = val < 0;
    val = Math.abs(val);
    let h1 = 1, h2 = 0, k1 = 0, k2 = 1;
    let b = val;
    do {
        const a = Math.floor(b);
        let aux = h1; h1 = a * h1 + h2; h2 = aux;
        aux = k1; k1 = a * k1 + k2; k2 = aux;
        b = 1 / (b - a);
    } while (Math.abs(val - h1 / k1) > val * tolerance && k1 < 100000);
    return (isNegative ? "-" : "") + h1 + "/" + k1;
}
