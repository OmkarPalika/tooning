export type Listener<T> = (data: T) => void;

export class EventEmitter<T> {
    private listeners: Listener<T>[] = [];

    public event = (listener: Listener<T>) => {
        this.listeners.push(listener);
        return {
            dispose: () => {
                this.listeners = this.listeners.filter(l => l !== listener);
            }
        };
    };

    public fire(data: T) {
        for (const listener of this.listeners) {
            listener(data);
        }
    }
}
