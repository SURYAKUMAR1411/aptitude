import { useState, useCallback } from 'react';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const SortableItem = ({ id, text, index, disabled }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id, disabled });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`sortable-item ${isDragging ? 'dragging' : ''}`}
            {...attributes}
            {...listeners}
        >
            <span className="sortable-handle">⠿</span>
            <span className="sortable-number">{index + 1}</span>
            <span style={{ flex: 1, fontSize: '0.9375rem', lineHeight: 1.5 }}>{text}</span>
        </div>
    );
};

const ParaJumbleQuestion = ({ question, onSubmit, showResult, disabled }) => {
    const [items, setItems] = useState(() => {
        // Shuffle the sentences initially
        const shuffled = question.sentences.map((text, idx) => ({
            id: `sent-${idx}`,
            text,
            originalIndex: idx,
        }));
        // Fisher-Yates shuffle
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    });

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = useCallback((event) => {
        const { active, over } = event;
        if (active.id !== over?.id) {
            setItems((prev) => {
                const oldIndex = prev.findIndex((i) => i.id === active.id);
                const newIndex = prev.findIndex((i) => i.id === over.id);
                return arrayMove(prev, oldIndex, newIndex);
            });
        }
    }, []);

    const handleSubmit = () => {
        const currentOrder = items.map(item => item.originalIndex);
        onSubmit(currentOrder);
    };

    const isCorrectOrder = () => {
        if (!question.correctOrder) return false;
        const currentOrder = items.map(item => item.originalIndex);
        return JSON.stringify(currentOrder) === JSON.stringify(question.correctOrder);
    };

    return (
        <div>
            <div style={{
                marginBottom: 'var(--space-4)',
                fontSize: '0.8125rem',
                color: 'var(--text-muted)',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-2)',
            }}>
                🔀 Drag and drop the sentences to arrange them in the correct order
            </div>

            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
            >
                <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                        {items.map((item, index) => (
                            <SortableItem
                                key={item.id}
                                id={item.id}
                                text={item.text}
                                index={index}
                                disabled={disabled}
                            />
                        ))}
                    </div>
                </SortableContext>
            </DndContext>

            {!showResult && (
                <div style={{ marginTop: 'var(--space-5)', textAlign: 'right' }}>
                    <button className="btn btn-primary btn-lg" onClick={handleSubmit}>
                        Submit Order
                    </button>
                </div>
            )}

            {showResult && (
                <div style={{
                    marginTop: 'var(--space-4)',
                    padding: 'var(--space-4)',
                    background: isCorrectOrder() ? '#EAFAF1' : '#FDECEC',
                    border: `1px solid ${isCorrectOrder() ? 'var(--success)' : 'var(--error)'}`,
                    borderRadius: 'var(--radius-md)',
                }}>
                    <strong>{isCorrectOrder() ? '✅ Correct order!' : '❌ Incorrect order'}</strong>
                    {question.correctOrder && (
                        <div style={{ marginTop: 'var(--space-3)', fontSize: '0.875rem' }}>
                            <strong>Correct order:</strong>
                            <ol style={{ paddingLeft: '1.25rem', marginTop: 'var(--space-2)' }}>
                                {question.correctOrder.map((idx, i) => (
                                    <li key={i} style={{ marginBottom: 4, color: 'var(--text-secondary)' }}>
                                        {question.sentences[idx]}
                                    </li>
                                ))}
                            </ol>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default ParaJumbleQuestion;
