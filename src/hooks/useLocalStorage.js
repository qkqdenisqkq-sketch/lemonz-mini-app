import { useEffect, useState } from "react";

export function useLocalStorage(key, fallbackValue) {
    const [value, setValue] = useState(() => {
        try {
            const storedValue = localStorage.getItem(key);

            if (!storedValue) {
                return fallbackValue;
            }

            return JSON.parse(storedValue);
        } catch {
            return fallbackValue;
        }
    });

    useEffect(() => {
        localStorage.setItem(
            key,
            JSON.stringify(value)
        );
    }, [key, value]);

    return [value, setValue];
}