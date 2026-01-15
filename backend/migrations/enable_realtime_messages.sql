-- Habilita Realtime para a tabela processed_messages
-- Isso é CRUCIAL para que o MessageProcessor receba os eventos de INSERT

begin;
  -- Adiciona a tabela à publicação 'supabase_realtime' se ainda não estiver
  alter publication supabase_realtime add table processed_messages;
commit;
