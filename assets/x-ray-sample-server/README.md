# X-Ray sample server
## X-ray with sequelize

### sequelize >= 5
add dialectModule in sequelize option
```typescript
{
  dialectModule: AWSXRay.captureMySQL(require('mysql2')),
  ...
}
```
### sequelize <5
add `lib/mysql.ts`
```typescript
import AWSXRay from 'aws-xray-sdk';
module.exports = AWSXRay.captureMySQL(require('mysql'));
```

add dialectModulePath in sequelize option in absolute path
```typescript
{
  dialectModulePath: resolve(__dirname, '../lib/mysql'),
  ...
}
```

