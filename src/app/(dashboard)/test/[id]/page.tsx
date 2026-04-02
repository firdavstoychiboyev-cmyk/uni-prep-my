"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Question, Topic, Medal } from "@/lib/firestore-schema";
import { fetchTopicById, fetchQuestionsByTopic, fetchTopicsByTextbook } from "@/lib/data-fetching";
import { useAuthStore } from "@/store/useAuthStore";
import { invalidateUserCache } from "@/lib/stats-utils";
import { useStatsStore } from "@/store/useStatsStore";
import { db } from "@/lib/firebase";
import { doc, setDoc, updateDoc, increment, serverTimestamp, collection, addDoc, getDoc, getDocs } from "firebase/firestore";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CheckCircle2, XCircle, RefreshCw, Award, Medal as MedalIcon, ShieldCheck, AlertCircle } from "lucide-react";
import { getMedalByErrors } from "@/lib/constants";

export default function TestPage() {
    const { id } = useParams();
    const router = useRouter();
    const { user } = useAuthStore();
    const { reset: resetStatsStore } = useStatsStore();

    const [topic, setTopic] = useState<Topic | null>(null);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [currentIdx, setCurrentIdx] = useState(0);
    const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
    const [isAnswered, setIsAnswered] = useState(false);
    const [results, setResults] = useState({ correct: 0, errors: 0 });
    const [isFinished, setIsFinished] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (id) {
            Promise.all([
                fetchTopicById(id as string),
                fetchQuestionsByTopic(id as string)
            ]).then(([topicData, questionsData]) => {
                setTopic(topicData);
                setQuestions(questionsData);
                setIsLoading(false);
            });
        }
    }, [id]);

    const resetTest = () => {
        setCurrentIdx(0);
        setSelectedAnswer(null);
        setIsAnswered(false);
        setResults({ correct: 0, errors: 0 });
        setIsFinished(false);
    };

    const handleAnswer = (option: string) => {
        if (isAnswered) return;

        const correct = option === questions[currentIdx].correctAnswer;
        setSelectedAnswer(option);
        setIsAnswered(true);

        if (correct) {
            setResults(prev => ({ ...prev, correct: prev.correct + 1 }));
        } else {
            setResults(prev => ({ ...prev, errors: prev.errors + 1 }));
        }

        setTimeout(() => {
            if (currentIdx < questions.length - 1) {
                setCurrentIdx(prev => prev + 1);
                setSelectedAnswer(null);
                setIsAnswered(false);
            } else {
                finishTest();
            }
        }, 1500);
    };

    const finishTest = async () => {
        setIsFinished(true);
        if (!user || !topic) return;
        // Invalidate all user caches so progress/stats reflect new results on next visit
        invalidateUserCache(user.id);
        resetStatsStore();

        const accuracy = Math.round((results.correct / questions.length) * 100);
        const medal = getMedalByErrors(results.errors, 1);

        const progressRef = doc(db, "users", user.id, "userProgress", topic.id);
        await setDoc(progressRef, {
            userId: user.id,
            topicId: topic.id,
            solvedQuestions: results.correct,
            errors: results.errors,
            medal: medal,
            accuracy: accuracy,
            completedAt: new Date().toISOString()
        });

        const historyRef = collection(db, "users", user.id, "testResults");
        await addDoc(historyRef, {
            topicId: topic.id,
            correctAnswers: results.correct,
            errors: results.errors,
            accuracy: accuracy,
            medal: medal,
            completedAt: serverTimestamp()
        });

        const textbookRef = doc(db, "textbooks", topic.textbookId);
        const textbookSnap = await getDoc(textbookRef);
        if (textbookSnap.exists()) {
            const textbookData = textbookSnap.data();
            const subjectId = textbookData.subjectId;
            const ratingRef = doc(db, "users", user.id, "ratings", subjectId);
            const ratingSnap = await getDoc(ratingRef);

            if (ratingSnap.exists()) {
                await updateDoc(ratingRef, {
                    stars: increment(results.correct),
                    lastUpdated: serverTimestamp()
                });
            } else {
                await setDoc(ratingRef, {
                    userId: user.id,
                    subjectId: subjectId,
                    stars: results.correct,
                    lastUpdated: serverTimestamp()
                });
            }

            const topics = await fetchTopicsByTextbook(topic.textbookId);
            const userProgressRef = collection(db, "users", user.id, "userProgress");
            const userProgressSnap = await getDocs(userProgressRef);

            const progressMap: Record<string, { medal?: string }> = {};
            userProgressSnap.forEach(doc => {
                progressMap[doc.id] = doc.data();
            });

            const allGreen = topics.every(t => {
                const m = t.id === topic.id ? medal : progressMap[t.id]?.medal;
                return m === 'green';
            });

            if (allGreen && topics.length > 0) {
                const badgeRef = doc(db, "users", user.id, "badges", topic.textbookId);
                const badgeSnap = await getDoc(badgeRef);

                if (!badgeSnap.exists()) {
                    await setDoc(badgeRef, {
                        name: `Знаток: ${textbookData.title}`,
                        description: "Вы прошли все темы учебника на идеальный результат",
                        textbookId: topic.textbookId,
                        icon: "🏆",
                        unlockedAt: serverTimestamp()
                    });
                }
            }
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <p className="text-gray-400 text-sm">Загрузка теста...</p>
            </div>
        );
    }

    if (!topic || questions.length === 0) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <p className="text-gray-400">Вопросы не найдены</p>
            </div>
        );
    }

    if (isFinished) {
        const medal = getMedalByErrors(results.errors, 1);

        const renderMedalIcon = (type: Medal) => {
            const baseClasses = "inline-flex items-center justify-center rounded-full";

            switch (type) {
                case "green":
                    return (
                        <div className={`${baseClasses} w-28 h-28 bg-emerald-100 border-2 border-emerald-300`}>
                            <ShieldCheck className="w-14 h-14 text-emerald-600" />
                        </div>
                    );
                case "grey":
                    return (
                        <div className={`${baseClasses} w-28 h-28 bg-gray-100 border-2 border-gray-300`}>
                            <Award className="w-14 h-14 text-gray-500" />
                        </div>
                    );
                case "bronze":
                    return (
                        <div className={`${baseClasses} w-28 h-28 bg-orange-100 border-2 border-orange-300`}>
                            <MedalIcon className="w-14 h-14 text-orange-500" />
                        </div>
                    );
                default:
                    return (
                        <div className={`${baseClasses} w-28 h-28 bg-gray-100 border-2 border-gray-200`}>
                            <AlertCircle className="w-14 h-14 text-gray-400" />
                        </div>
                    );
            }
        };

        const accuracyPercent = Math.round((results.correct / questions.length) * 100);
        let resultMessage = "Попробуйте ещё раз.";
        if (accuracyPercent >= 87) resultMessage = "Отличный результат";
        else if (accuracyPercent >= 70) resultMessage = "Хорошо, так держать";
        else if (accuracyPercent >= 50) resultMessage = "Неплохо. Попробуй ещё раз.";

        return (
            <div className="max-w-2xl mx-auto py-12 text-center animate-in fade-in zoom-in duration-500">
                <div className="mb-8 flex justify-center">
                    {renderMedalIcon(medal)}
                </div>
                <h1 className="text-3xl font-bold mb-6 text-gray-900">{resultMessage}</h1>

                <Card className="p-8 mb-8 bg-gray-50 border border-gray-200 shadow-sm">
                    <div className="grid grid-cols-1 gap-5">
                        <div className="flex items-center justify-between">
                            <span className="text-gray-500">Точность</span>
                            <span className="text-2xl font-bold text-gray-900">
                                {Math.round((results.correct / questions.length) * 100)}%
                            </span>
                        </div>
                        <div className="flex items-center justify-between border-t border-gray-200 pt-4">
                            <span className="text-gray-500">Правильно</span>
                            <span className="font-semibold text-gray-900">
                                {results.correct} / {questions.length}
                            </span>
                        </div>
                        <div className="flex items-center justify-between border-t border-gray-200 pt-4">
                            <span className="text-gray-500">Ошибки</span>
                            <span className="font-semibold text-gray-900">
                                {results.errors}
                            </span>
                        </div>
                    </div>
                </Card>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Button
                        onClick={() => router.push(`/textbook/${topic.textbookId}`)}
                        className="h-12 text-base bg-gray-900 text-white hover:bg-gray-800"
                    >
                        Вернуться к темам
                    </Button>
                    <Button
                        variant="outline"
                        onClick={resetTest}
                        className="h-12 text-base border-gray-300 text-gray-700 hover:bg-gray-50"
                    >
                        <RefreshCw className="mr-2" size={20} /> Пройти ещё раз
                    </Button>
                </div>
            </div>
        );
    }

    const currentQuestion = questions[currentIdx];
    const progress = ((currentIdx + 1) / questions.length) * 100;

    return (
        <div className="max-w-3xl mx-auto py-6">
            {/* Progress Header */}
            <div className="sticky top-0 z-20 mb-8 py-4 bg-white border-b border-gray-100">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-500">
                        Вопрос {currentIdx + 1} из {questions.length}
                    </span>
                    <span className="text-sm font-medium text-gray-500">
                        {Math.round(progress)}%
                    </span>
                </div>
                <Progress value={progress} className="h-1.5 bg-gray-200" />
            </div>

            {/* Question Section */}
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <h2 className="text-2xl font-semibold text-gray-900 mb-8 leading-relaxed">
                    {currentQuestion.text}
                </h2>

                <div className="grid grid-cols-1 gap-3">
                    {Object.entries(currentQuestion.options).map(([key, value]) => {
                        const isSelected = selectedAnswer === key;
                        const isCorrect = key === currentQuestion.correctAnswer;

                        let variantStyle = "border-gray-200 bg-white hover:border-gray-400 hover:bg-gray-50 text-gray-900";
                        if (isAnswered) {
                            if (isCorrect)
                                variantStyle = "border-emerald-400 bg-emerald-50 text-gray-900";
                            else if (isSelected)
                                variantStyle = "border-red-400 bg-red-50 text-gray-900";
                            else
                                variantStyle = "border-gray-100 bg-gray-50 text-gray-400";
                        }

                        return (
                            <button
                                key={key}
                                onClick={() => handleAnswer(key)}
                                disabled={isAnswered}
                                className={`flex items-center gap-4 w-full p-5 border-2 rounded-2xl text-left transition-all duration-200 ${variantStyle}`}
                            >
                                <span
                                    className={`w-8 h-8 rounded-full flex items-center justify-center font-bold border-2 flex-shrink-0 ${
                                        isAnswered && isCorrect
                                            ? "bg-emerald-500 border-emerald-400 text-white"
                                            : isAnswered && isSelected && !isCorrect
                                            ? "bg-red-500 border-red-400 text-white"
                                            : "border-gray-300 text-gray-500"
                                    }`}
                                >
                                    {key.toUpperCase()}
                                </span>
                                <span className="text-base font-medium">
                                    {value}
                                </span>
                                {isAnswered && isCorrect && (
                                    <CheckCircle2 className="ml-auto text-emerald-500 flex-shrink-0" />
                                )}
                                {isAnswered && isSelected && !isCorrect && (
                                    <XCircle className="ml-auto text-red-500 flex-shrink-0" />
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
