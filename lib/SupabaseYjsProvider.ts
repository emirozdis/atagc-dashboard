import { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
import * as Y from 'yjs';
import { Observable } from 'lib0/observable';
import { Awareness } from 'y-protocols/awareness';

interface SupabaseYjsProviderOptions {
    channel: RealtimeChannel;
    doc: Y.Doc;
    awareness: Awareness;
}

export class SupabaseYjsProvider extends Observable<string> {
    private channel: RealtimeChannel;
    public doc: Y.Doc;
    public awareness: Awareness;
    private _synced: boolean = false;

    constructor({ channel, doc, awareness }: SupabaseYjsProviderOptions) {
        super();
        this.channel = channel;
        this.doc = doc;
        this.awareness = awareness;

        // Connect to channel
        this.connect();
    }

    get synced() {
        return this._synced;
    }

    set synced(state: boolean) {
        if (this._synced !== state) {
            this._synced = state;
            this.emit('synced', [state]);
            this.emit('sync', [state]);
        }
    }

    private async connect() {
        this.doc.on('update', this.handleDocUpdate);
        this.awareness.on('update', this.handleAwarenessUpdate);

        // Subscribe to channel events
        this.channel
            .on('broadcast', { event: 'update' }, ({ payload }) => {
                // Apply received update
                const update = new Uint8Array(payload.update);
                Y.applyUpdate(this.doc, update, this);
            })
            .on('broadcast', { event: 'awareness' }, ({ payload }) => {
                // Apply awareness update
                const update = new Uint8Array(payload.update);
                import('y-protocols/awareness').then(({ applyAwarenessUpdate }) => {
                    applyAwarenessUpdate(this.awareness, update, this);
                });
            })
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    this.synced = true;
                    // Broadcast initial awareness
                    if (this.awareness.getLocalState() !== null) {
                        const update = import('y-protocols/awareness').then(({ encodeAwarenessUpdate }) => {
                            const update = encodeAwarenessUpdate(this.awareness, [this.doc.clientID]);
                            this.channel.send({
                                type: 'broadcast',
                                event: 'awareness',
                                payload: { update: Array.from(update) },
                            });
                        });
                    }
                } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                    this.synced = false;
                }
            });
    }

    private handleDocUpdate = (update: Uint8Array, origin: any) => {
        if (origin !== this) {
            this.channel.send({
                type: 'broadcast',
                event: 'update',
                payload: { update: Array.from(update) },
            });
        }
    };

    private handleAwarenessUpdate = ({ added, updated, removed }: any, origin: any) => {
        if (origin !== this) {
            import('y-protocols/awareness').then(({ encodeAwarenessUpdate }) => {
                const changedClients = added.concat(updated).concat(removed);
                const update = encodeAwarenessUpdate(this.awareness, changedClients);
                this.channel.send({
                    type: 'broadcast',
                    event: 'awareness',
                    payload: { update: Array.from(update) },
                });
            });
        }
    };

    public destroy() {
        this.doc.off('update', this.handleDocUpdate);
        this.awareness.off('update', this.handleAwarenessUpdate);
        this.channel.unsubscribe();
        this._synced = false;
    }
}
