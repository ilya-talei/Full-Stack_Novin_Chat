import Session from "./session.js";
import User from "./user.js";
import Permission from "./permission.js";
import UserPermission from "./userPermission.js";
import Tenant from "./tenant.js";
import Product from "./product.js";
import Subscription from "./subscription.js";
import RolePermission from "./rolePermissions.js";
import Role from "./role.js";

User.hasMany(Session);
Session.belongsTo(User);

Permission.hasMany(UserPermission, { foreignKey: "permission_id" });
UserPermission.belongsTo(Permission, { foreignKey: "permission_id" });
User.hasMany(UserPermission, { foreignKey: "user_id" });
UserPermission.belongsTo(User, { foreignKey: "user_id" });

RolePermission.belongsTo(Role, { foreignKey: "role_id" });
Role.hasMany(RolePermission, { foreignKey: "role_id" });
RolePermission.belongsTo(Permission, { foreignKey: "permission_id" });
Permission.hasMany(RolePermission, { foreignKey: "permission_id" });

Tenant.belongsTo(User, { foreignKey: "creator_id" });
User.hasMany(Tenant, { foreignKey: "creator_id" });

Tenant.hasMany(Subscription, { foreignKey: "tenant_id" });
Subscription.belongsTo(Tenant, { foreignKey: "tenant_id" });

Product.hasMany(Subscription, { foreignKey: "product_id" });
Subscription.belongsTo(Product, { foreignKey: "product_id" });

Tenant.belongsToMany(Product, {
    through: Subscription,
    foreignKey: "tenant_id",
});
Product.belongsToMany(Tenant, {
    through: Subscription,
    foreignKey: "product_id",
});
