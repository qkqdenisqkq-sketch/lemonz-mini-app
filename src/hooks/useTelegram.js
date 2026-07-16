import { useEffect, useMemo } from "react";

const ADMIN_TELEGRAM_IDS = [
    123456789,
];

export function useTelegram() {
    const telegram = window.Telegram?.WebApp;
    const user = telegram?.initDataUnsafe?.user;

    useEffect(() => {
        telegram?.ready?.();
        telegram?.expand?.();
    }, [telegram]);

    const isAdmin = useMemo(() => {
        return (
            import.meta.env.DEV ||
            ADMIN_TELEGRAM_IDS.includes(
                Number(user?.id)
            )
        );
    }, [user?.id]);

    const showMessage = (message) => {
        if (
            telegram?.initData &&
            typeof telegram.showAlert === "function"
        ) {
            telegram.showAlert(message);
            return;
        }

        window.alert(message);
    };

    const haptic = (type = "selection") => {
        if (type === "success") {
            telegram?.HapticFeedback
                ?.notificationOccurred?.(
                    "success"
                );
            return;
        }

        if (type === "warning") {
            telegram?.HapticFeedback
                ?.notificationOccurred?.(
                    "warning"
                );
            return;
        }

        if (type === "medium") {
            telegram?.HapticFeedback
                ?.impactOccurred?.(
                    "medium"
                );
            return;
        }

        telegram?.HapticFeedback
            ?.selectionChanged?.();
    };

    return {
        telegram,
        user,
        isAdmin,
        showMessage,
        haptic,
    };
}
