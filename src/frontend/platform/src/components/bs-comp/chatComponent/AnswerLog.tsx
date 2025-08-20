import { Badge } from "@/components/bs-ui/badge";
import { Info } from "lucide-react";
import { useTranslation } from "react-i18next";

// 只有工作流才展示
export default function AnswerLog({ className = '', onShowLog }) {
    const { t } = useTranslation()

    return <div className={className}>
        <Badge className="cursor-pointer" variant="outline" onClick={onShowLog}>{t('chat.viewLog')}</Badge>
    </div>
};
