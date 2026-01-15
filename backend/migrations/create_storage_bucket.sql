-- Cria um bucket privado para armazenar mídias do WhatsApp
insert into storage.buckets (id, name, public)
values ('whatsapp-evidence', 'whatsapp-evidence', false)
on conflict (id) do nothing;

-- Política: Usuários podem ver seus próprios arquivos (baseado no folder userId)
create policy "Users can view their own whatsapp evidence"
on storage.objects for select
using ( bucket_id = 'whatsapp-evidence' and auth.uid()::text = (storage.foldername(name))[1] );

-- Política: Service Role (Backend) pode fazer tudo
create policy "Service Role full access"
on storage.objects for all
using ( bucket_id = 'whatsapp-evidence' )
with check ( bucket_id = 'whatsapp-evidence' );
