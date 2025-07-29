/*
 * @Author: FlowerHeap flowerheap@qq.com
 * @Date: 2025-07-28 09:41:25
 * @LastEditors: FlowerHeap flowerheap@qq.com
 * @LastEditTime: 2025-07-29 22:34:27
 * @FilePath: \bisheng\src\frontend\platform\src\pages\BuildPage\flow\FlowChat\GuideQuestions.tsx
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import { ChevronDown, ChevronUp } from "lucide-react"
import { forwardRef, useEffect, useImperativeHandle, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"

// 引导词推荐
const GuideQuestions = forwardRef(({ locked, chatId, onClick, bottom, hiddenGuideQuestion, setHiddenGuideQuestion }, ref) => {

    const { t } = useTranslation()
    const [questions, setQuestions] = useState([]) // State to hold questions

    console.log('hiddenGuideQuestion', hiddenGuideQuestion);
    

    useImperativeHandle(ref, () => ({
        updateQuestions(newQuestions) { // Expose this method to the parent
            console.log('newQuestions :>> ', newQuestions);
            setQuestions(newQuestions)
        }
    }))

    useEffect(() => {
        setQuestions([]) // Clear questions when chatId changes
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

    return (
        <div className="relative">
            <div
                className="absolute left-0"
                style={{ bottom: `${(bottom || 0) + 0}px` }}
            >   
                <div className="flex items-center mb-2">
                    <p
                        className="text-gray-950 text-sm bg-[rgba(255,255,255,0.8)] rounded-md w-fit px-2 py-1 cursor-pointer"
                        onClick={() => setHiddenGuideQuestion(!hiddenGuideQuestion)}
                    >
                        {t('chat.recommendationQuestions')}

                    </p>
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
                            className="w-fit  max-w-[300px] md:max-w-[700px] break-words bg-[#d4dffa] border-2 border-gray-50 shadow-md text-gray-600 rounded-md mb-1 px-4 py-1 text-sm cursor-pointer"
                            onClick={() => {
                                onClick(question)
                                // 历史逻辑： 选择某个问题之后就不再展示这个问题
                                // setQuestions([])
                            }}
                        >
                            {question}
                        </div>
                    ))
                }
            </div>
        </div>
    )
})

export default GuideQuestions
