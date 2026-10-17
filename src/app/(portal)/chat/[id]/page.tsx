import { getConversationMessages } from "@/lib/data/chat";
import { getCurrentUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import SecondaryScreenShell from "@/components/layout/SecondaryScreenShell";
import { sendMessage } from "../actions";

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();

  // Marcar como leidos los mensajes de otros al abrir la conversacion.
  const supabase = await createClient();
  if (user) {
    await supabase
      .from("messages")
      .update({ read_at: new Date().toISOString() })
      .eq("conversation_id", id)
      .is("read_at", null)
      .neq("sender_id", user.id);
  }

  const messages = await getConversationMessages(id);
  const sendMessageWithId = sendMessage.bind(null, id);

  return (
    <SecondaryScreenShell fallbackHref="/chat">
      {/* h-full en lg+ encaja exactamente en la zona de scroll del shell
          (que ya no necesita moverse: el mensaje-a-mensaje scrollea dentro
          de su propio div, el formulario de envio se queda fijo abajo). En
          movil, sin esa altura garantizada por el shell, se usa una altura
          de viewport razonable en su lugar. */}
      <div className="mx-auto flex h-[70vh] max-w-2xl flex-col lg:h-full">
        <div className="flex h-full flex-col rounded-xl border border-orion-navy-100 bg-white">
          <div className="flex-1 space-y-2 overflow-y-auto p-4">
            {messages.length === 0 && (
              <p className="text-center text-sm text-orion-navy-400">Todavía no hay mensajes.</p>
            )}
            {messages.map((m) => {
              const mine = m.senderId === user?.id;
              return (
                <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${
                      mine
                        ? "bg-orion-navy-700 text-white"
                        : "bg-orion-navy-100 text-orion-navy-900"
                    }`}
                  >
                    <p>{m.body}</p>
                    <p className={`mt-1 text-[10px] ${mine ? "text-white/60" : "text-orion-navy-400"}`}>
                      {new Date(m.sentAt).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          <form action={sendMessageWithId} className="flex gap-2 border-t border-orion-navy-100 p-3">
            <input
              name="body"
              placeholder="Escribe un mensaje…"
              autoComplete="off"
              className="flex-1 rounded-full border border-orion-navy-200 px-4 py-2 text-sm"
            />
            <button
              type="submit"
              className="rounded-full bg-orion-navy-700 px-4 py-2 text-sm font-semibold text-white hover:bg-orion-navy-800"
            >
              Enviar
            </button>
          </form>
        </div>
      </div>
    </SecondaryScreenShell>
  );
}
