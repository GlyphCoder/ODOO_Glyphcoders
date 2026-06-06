export const notifyUsers = async (supabaseAdmin, {
  userIds, title, message, type, entityType, entityId
}) => {
  try {
    if (!userIds || userIds.length === 0) return;
    const rows = userIds.map(uid => ({
      user_id: uid,
      title,
      message,
      type,
      entity_type: entityType,
      entity_id: entityId,
    }));
    await supabaseAdmin.from('notifications').insert(rows);
  } catch (err) {
    console.error('Notify users failed:', err.message);
  }
};
