import { useEffect, useMemo, useState } from "react"
import { useMessageStore } from "./messageStore"
import { useTranslation } from "react-i18next"
import { ChevronDown, ChevronUp } from "lucide-react";


// 引导词推荐
export default function GuideQuestions({ locked, chatId, questions, onClick, bottom }) {
    const [showGuideQuestion, setShowGuideQuestion] = useMessageStore(state => [state.showGuideQuestion, state.setShowGuideQuestion])
    const [hiddenGuideQuestion, setHiddenGuideQuestion] = useMessageStore(state => [state.hiddenGuideQuestion, state.setHiddenGuideQuestion])

    const { t } = useTranslation()

    useEffect(() => {
        questions.length && setShowGuideQuestion(true)
    }, [chatId])

    const words = useMemo(() => {
        if (questions.length < 4) return questions
        // 随机按序取三个
        const res = []
        const randomIndex = Math.floor(Math.random() * questions.length)
        for (let i = 0; i < 3; i++) {
            const item = questions[(randomIndex + i) % (questions.length - 1)]
            res.push(item)
        }
        return res
    }, [questions])

    if (locked || !words.length) return null

    if (showGuideQuestion) return <div className="relative">
        <div
            className="absolute left-0"
            style={{ bottom: `${(bottom || 0)}px` }}
        >
            <div className="flex items-center mb-2">
                <p
                    className="text-gray-950 text-sm bg-[rgba(255,255,255,0.8)] rounded-md w-fit px-2 py-1 cursor-pointer"
                    onClick={() => setHiddenGuideQuestion(!hiddenGuideQuestion)}
                >{t('chat.recommendationQuestions')}</p>
                <button 
                    className="ml-1 p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
                    onClick={() => setHiddenGuideQuestion(!hiddenGuideQuestion)}
                    aria-label={hiddenGuideQuestion ? t('chat.expand') : t('chat.collapse')}
                >
                    {hiddenGuideQuestion ? (
                        <ChevronUp size={16} />
                    ) : (
                        <ChevronDown size={16} />
                    )}
                </button>
            </div>
            {
                !hiddenGuideQuestion && words.map((question, index) => (
                    <div
                        key={index}
                        className="w-fit bg-[#d4dffa] border-2 border-gray-50 shadow-md text-gray-600 rounded-md mb-1 px-4 py-1 text-sm cursor-pointer"
                        onClick={() => {
                            // setShowGuideQuestion(false)
                            onClick(question)
                            setHiddenGuideQuestion(true);
                        }}
                    >{question}</div>
                ))
            }
        </div>
    </div>


    return null
};
